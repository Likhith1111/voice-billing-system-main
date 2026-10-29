from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DashboardDataView, LoginView, RegisterView, UpdateProfileView, CustomerViewSet, ProductViewSet, BillViewSet, VoiceBillingView, ImageBillingView, GenerateBillView, DetectBarcodeView
from .admin_views import AdminLoginView, AdminOverviewView, AdminShopsListView, AdminShopDetailView, AdminShopDeleteView

router = DefaultRouter()
router.register(r'customers', CustomerViewSet, basename='customer')
router.register(r'products', ProductViewSet, basename='product')
router.register(r'bills', BillViewSet, basename='bill')


urlpatterns = [
    path('dashboard-data/', DashboardDataView.as_view(), name='dashboard-data'),
    path('login/', LoginView.as_view(), name='login'),
    path('register/', RegisterView.as_view(), name='register'),
    path('update-profile/', UpdateProfileView.as_view(), name='update-profile'),
    path('voice-billing/', VoiceBillingView.as_view(), name='voice-billing'),
    path('image-billing/', ImageBillingView.as_view(), name='image-billing'),
    path('detect-barcode/', DetectBarcodeView.as_view(), name='detect-barcode'),
    path('generate-bill/', GenerateBillView.as_view(), name='generate-bill'),
    # Platform Admin Endpoints
    path('admin/login/', AdminLoginView.as_view(), name='admin-login'),
    path('admin/overview/', AdminOverviewView.as_view(), name='admin-overview'),
    path('admin/shops/', AdminShopsListView.as_view(), name='admin-shops-list'),
    path('admin/shops/<int:shop_id>/', AdminShopDetailView.as_view(), name='admin-shop-detail'),
    path('admin/shops/<int:shop_id>/delete/', AdminShopDeleteView.as_view(), name='admin-shop-delete'),
    path('', include(router.urls)),
]

