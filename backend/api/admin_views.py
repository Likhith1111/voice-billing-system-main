import os
import re
from datetime import datetime, date
from django.utils import timezone
from django.contrib.auth import get_user_model, authenticate
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from .models import ShopkeeperProfile, Bill, Product, Customer, Notification

User = get_user_model()

def parse_amount(val):
    if not val:
        return 0.0
    try:
        cleaned = re.sub(r'[^\d.]', '', str(val))
        return float(cleaned) if cleaned else 0.0
    except Exception:
        return 0.0

def format_inr(val):
    try:
        num = float(val)
        return f"₹{num:,.2f}" if num % 1 != 0 else f"₹{int(num):,}"
    except Exception:
        return "₹0"


class AdminLoginView(APIView):
    """
    Authenticate super administrator to access the platform monitoring panel.
    Accepts username/email and password.
    """
    def post(self, request):
        username = str(request.data.get('username', '')).strip()
        password = str(request.data.get('password', '')).strip()

        if not username or not password:
            return Response({'success': False, 'error': 'Username and password are required.'}, status=status.HTTP_400_BAD_REQUEST)

        # 1. Try standard Django user authentication
        user = authenticate(username=username, password=password)
        if not user:
            # Try finding user by email
            user_obj = User.objects.filter(email__iexact=username).first()
            if user_obj and user_obj.check_password(password):
                user = user_obj

        # 2. Hardcoded fallback / quick-pass for admin convenience
        if not user:
            if (username.lower() in ['admin', 'admin@example.com', 'admin@qbill.com']) and password in ['admin123', 'admin']:
                user_obj, _ = User.objects.get_or_create(username='admin', defaults={'email': 'admin@example.com', 'is_staff': True, 'is_superuser': True})
                user_obj.set_password('admin123')
                user_obj.is_staff = True
                user_obj.is_superuser = True
                user_obj.save()
                user = user_obj

        if user and (user.is_staff or user.is_superuser or user.username == 'admin'):
            return Response({
                'success': True,
                'token': f"admin_token_{user.id}_{int(timezone.now().timestamp())}",
                'admin': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email or 'admin@qbill.com',
                    'is_staff': user.is_staff,
                    'is_superuser': user.is_superuser,
                    'role': 'Super Administrator'
                }
            })

        return Response({'success': False, 'error': 'Invalid admin credentials. Use admin / admin123'}, status=status.HTTP_401_UNAUTHORIZED)


class AdminOverviewView(APIView):
    """
    Returns platform-wide KPIs, metrics, registration growth, and recent billing activity.
    """
    def get(self, request):
        all_shops = list(ShopkeeperProfile.objects.all().order_by('-created_at'))
        all_bills = list(Bill.objects.all().order_by('-id'))
        all_products = list(Product.objects.all())
        all_customers = list(Customer.objects.all())

        total_shops = len(all_shops)
        total_bills = len(all_bills)
        total_products = len(all_products)
        total_customers = len(all_customers)

        total_platform_revenue = sum(parse_amount(b.amount) for b in all_bills)

        # Calculate today's metrics
        today = date.today()
        today_bills_list = [b for b in all_bills if b.created_at and b.created_at.date() == today]
        today_revenue = sum(parse_amount(b.amount) for b in today_bills_list)

        # Active shops calculation (shops with at least 1 bill or 1 product)
        active_shop_ids = set()
        for b in all_bills:
            if b.shopkeeper_id:
                active_shop_ids.add(b.shopkeeper_id)
        for p in all_products:
            if p.shopkeeper_id:
                active_shop_ids.add(p.shopkeeper_id)
        active_shops_count = len(active_shop_ids) if active_shop_ids else (total_shops if total_shops > 0 else 0)

        # Top performing shops
        shops_revenue = {}
        shops_bills_count = {}
        for b in all_bills:
            sk_id = b.shopkeeper_id
            if sk_id:
                shops_revenue[sk_id] = shops_revenue.get(sk_id, 0.0) + parse_amount(b.amount)
                shops_bills_count[sk_id] = shops_bills_count.get(sk_id, 0) + 1

        top_shops = []
        for s in all_shops:
            rev = shops_revenue.get(s.id, 0.0)
            b_count = shops_bills_count.get(s.id, 0)
            top_shops.append({
                'id': s.id,
                'name': s.name,
                'store_name': s.store_name,
                'email': s.email,
                'revenue': rev,
                'formatted_revenue': format_inr(rev),
                'bills_count': b_count,
            })
        top_shops.sort(key=lambda x: (x['revenue'], x['bills_count']), reverse=True)

        # Recent activities across all shops
        recent_activity = []
        for b in all_bills[:15]:
            sk = b.shopkeeper
            recent_activity.append({
                'id': b.id,
                'invoice': b.invoice,
                'customer': b.customer,
                'amount': b.amount,
                'parsed_amount': parse_amount(b.amount),
                'payment_mode': b.payment_mode or 'Cash',
                'time': b.time or (b.created_at.strftime('%I:%M %p') if b.created_at else 'Recent'),
                'created_at': b.created_at.isoformat() if b.created_at else None,
                'shop_id': sk.id if sk else None,
                'store_name': sk.store_name if sk else 'Store',
                'shopkeeper_name': sk.name if sk else 'Shopkeeper',
                'status': b.status or 'Paid'
            })

        return Response({
            'success': True,
            'summary': {
                'total_shops': total_shops,
                'active_shops': active_shops_count,
                'total_platform_revenue': total_platform_revenue,
                'formatted_platform_revenue': format_inr(total_platform_revenue),
                'total_bills': total_bills,
                'total_products': total_products,
                'total_customers': total_customers,
                'today_revenue': today_revenue,
                'formatted_today_revenue': format_inr(today_revenue),
                'today_bills_count': len(today_bills_list),
            },
            'top_shops': top_shops[:5],
            'recent_activity': recent_activity
        })


class AdminShopsListView(APIView):
    """
    Returns full list of registered shops with activity metrics for monitoring.
    """
    def get(self, request):
        query = request.query_params.get('search', '').strip().lower()
        shops = ShopkeeperProfile.objects.all().order_by('-created_at')

        results = []
        for s in shops:
            # If search query provided, filter by store_name, name, email, phone
            if query:
                search_haystack = f"{s.store_name or ''} {s.name or ''} {s.email or ''} {s.phone or ''}".lower()
                if query not in search_haystack:
                    continue

            bills = s.bills.all()
            bills_count = bills.count()
            total_revenue = sum(parse_amount(b.amount) for b in bills)
            products_count = s.products.count()
            customers_count = s.customers.count()
            
            latest_bill = bills.order_by('-id').first()
            last_active = None
            if latest_bill:
                last_active = latest_bill.created_at.strftime('%d %b %Y, %I:%M %p') if latest_bill.created_at else latest_bill.time
            elif s.created_at:
                last_active = s.created_at.strftime('%d %b %Y, %I:%M %p')

            # Status classification
            if bills_count > 0:
                activity_status = 'Active'
            elif products_count > 0:
                activity_status = 'Catalog Ready'
            else:
                activity_status = 'New Store'

            results.append({
                'id': s.id,
                'name': s.name,
                'store_name': s.store_name,
                'email': s.email,
                'phone': s.phone or '',
                'address': s.address or '',
                'upi_id': s.upi_id or '',
                'created_at': s.created_at.isoformat() if s.created_at else None,
                'created_at_formatted': s.created_at.strftime('%d %b %Y, %I:%M %p') if s.created_at else 'Recent',
                'bills_count': bills_count,
                'total_revenue': total_revenue,
                'formatted_revenue': format_inr(total_revenue),
                'products_count': products_count,
                'customers_count': customers_count,
                'last_active': last_active or 'Recently registered',
                'status': activity_status
            })

        return Response({
            'success': True,
            'total_count': len(results),
            'shops': results
        })


class AdminShopDetailView(APIView):
    """
    Deep-dive into a single shopkeeper's store profile, invoices, products, and customers.
    """
    def get(self, request, shop_id):
        shop = ShopkeeperProfile.objects.filter(id=shop_id).first()
        if not shop:
            return Response({'success': False, 'error': 'Shopkeeper not found.'}, status=status.HTTP_404_NOT_FOUND)

        bills = shop.bills.all().order_by('-id')
        products = shop.products.all()
        customers = shop.customers.all()

        total_rev = sum(parse_amount(b.amount) for b in bills)

        bills_list = []
        for b in bills[:50]:
            bills_list.append({
                'id': b.id,
                'invoice': b.invoice,
                'customer': b.customer,
                'amount': b.amount,
                'payment_mode': b.payment_mode or 'Cash',
                'time': b.time,
                'status': b.status,
                'created_at': b.created_at.isoformat() if b.created_at else None,
                'created_at_formatted': b.created_at.strftime('%d %b %Y, %I:%M %p') if b.created_at else b.time
            })

        products_list = []
        for p in products[:50]:
            products_list.append({
                'id': p.id,
                'name': p.name,
                'barcode': p.barcode or '',
                'value': p.value,
                'sold': p.sold,
                'color': p.color
            })

        customers_list = []
        for c in customers[:50]:
            customers_list.append({
                'id': c.id,
                'name': c.name,
                'phone': c.phone,
                'initials': c.initials or (c.name[:2].upper() if c.name else 'CU'),
                'tone': c.tone or 'violet'
            })

        return Response({
            'success': True,
            'shop': {
                'id': shop.id,
                'name': shop.name,
                'store_name': shop.store_name,
                'email': shop.email,
                'phone': shop.phone or '',
                'address': shop.address or '',
                'upi_id': shop.upi_id or '',
                'created_at': shop.created_at.isoformat() if shop.created_at else None,
                'created_at_formatted': shop.created_at.strftime('%d %b %Y, %I:%M %p') if shop.created_at else 'Recent',
                'stats': {
                    'total_bills': bills.count(),
                    'total_revenue': total_rev,
                    'formatted_revenue': format_inr(total_rev),
                    'total_products': products.count(),
                    'total_customers': customers.count(),
                },
                'recent_bills': bills_list,
                'products': products_list,
                'customers': customers_list
            }
        })


class AdminShopDeleteView(APIView):
    """
    Allows super admin to remove a shopkeeper and associated records.
    """
    def delete(self, request, shop_id):
        shop = ShopkeeperProfile.objects.filter(id=shop_id).first()
        if not shop:
            return Response({'success': False, 'error': 'Shopkeeper not found.'}, status=status.HTTP_404_NOT_FOUND)

        store_name = shop.store_name
        shop.delete()

        return Response({
            'success': True,
            'message': f"Store '{store_name}' (ID: {shop_id}) and its related records have been deleted."
        })
