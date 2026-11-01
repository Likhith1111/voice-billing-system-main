import os
import io
import json
import logging
import base64
import requests
from django.conf import settings

logger = logging.getLogger(__name__)

def clean_phone_number(phone: str) -> str:
    """Normalizes phone number to international format without + or spaces (defaults to India 91)."""
    if not phone:
        return ""
    digits = "".join(filter(str.isdigit, phone)).lstrip("0")
    if len(digits) == 10:
        digits = f"91{digits}"
    return digits

def is_whatsapp_configured() -> dict:
    """Checks which WhatsApp sending provider is configured in environment variables."""
    meta_token = os.environ.get("WHATSAPP_CLOUD_API_TOKEN") or getattr(settings, "WHATSAPP_CLOUD_API_TOKEN", "")
    meta_phone_id = os.environ.get("WHATSAPP_PHONE_NUMBER_ID") or getattr(settings, "WHATSAPP_PHONE_NUMBER_ID", "")
    
    twilio_sid = os.environ.get("TWILIO_ACCOUNT_SID") or getattr(settings, "TWILIO_ACCOUNT_SID", "")
    twilio_token = os.environ.get("TWILIO_AUTH_TOKEN") or getattr(settings, "TWILIO_AUTH_TOKEN", "")
    twilio_phone = os.environ.get("TWILIO_PHONE_NUMBER") or getattr(settings, "TWILIO_PHONE_NUMBER", "")

    ultramsg_instance = os.environ.get("ULTRAMSG_INSTANCE_ID") or getattr(settings, "ULTRAMSG_INSTANCE_ID", "")
    ultramsg_token = os.environ.get("ULTRAMSG_TOKEN") or getattr(settings, "ULTRAMSG_TOKEN", "")

    if meta_token and meta_phone_id:
        return {"configured": True, "provider": "meta"}
    if twilio_sid and twilio_token and twilio_phone:
        return {"configured": True, "provider": "twilio"}
    if ultramsg_instance and ultramsg_token:
        return {"configured": True, "provider": "ultramsg"}

    return {"configured": False, "provider": None}

def send_via_meta_cloud_api(phone: str, pdf_bytes: bytes, filename: str, caption: str) -> dict:
    """
    Sends an actual PDF document directly to a customer's WhatsApp phone number
    using Meta WhatsApp Business Cloud API.
    """
    meta_token = os.environ.get("WHATSAPP_CLOUD_API_TOKEN") or getattr(settings, "WHATSAPP_CLOUD_API_TOKEN", "")
    meta_phone_id = os.environ.get("WHATSAPP_PHONE_NUMBER_ID") or getattr(settings, "WHATSAPP_PHONE_NUMBER_ID", "")

    if not meta_token or not meta_phone_id:
        return {"success": False, "error": "Meta WhatsApp Cloud API credentials not configured"}

    clean_phone = clean_phone_number(phone)

    # Step 1: Upload PDF media to Meta
    upload_url = f"https://graph.facebook.com/v20.0/{meta_phone_id}/media"
    headers = {
        "Authorization": f"Bearer {meta_token}",
    }
    files = {
        "file": (filename, pdf_bytes, "application/pdf"),
    }
    data = {
        "messaging_product": "whatsapp",
        "type": "application/pdf",
    }

    try:
        upload_res = requests.post(upload_url, headers=headers, files=files, data=data, timeout=15)
        upload_data = upload_res.json()
        media_id = upload_data.get("id")
        if not media_id:
            logger.error("Meta media upload failed: %s", upload_data)
            return {"success": False, "error": upload_data.get("error", {}).get("message", "Media upload failed")}

        # Step 2: Send document message using the media_id
        msg_url = f"https://graph.facebook.com/v20.0/{meta_phone_id}/messages"
        json_payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": clean_phone,
            "type": "document",
            "document": {
                "id": media_id,
                "caption": caption,
                "filename": filename,
            },
        }
        send_res = requests.post(msg_url, headers=headers, json=json_payload, timeout=15)
        send_data = send_res.json()

        if send_res.status_code in [200, 201] and send_data.get("messages"):
            return {"success": True, "message_id": send_data["messages"][0]["id"], "provider": "meta"}
        else:
            return {"success": False, "error": send_data.get("error", {}).get("message", "Failed to send message")}
    except Exception as e:
        logger.exception("Error sending WhatsApp PDF via Meta: %s", e)
        return {"success": False, "error": str(e)}

def send_via_ultramsg(phone: str, pdf_bytes: bytes, filename: str, caption: str) -> dict:
    """Sends PDF directly via UltraMsg WhatsApp Gateway."""
    instance_id = os.environ.get("ULTRAMSG_INSTANCE_ID") or getattr(settings, "ULTRAMSG_INSTANCE_ID", "")
    token = os.environ.get("ULTRAMSG_TOKEN") or getattr(settings, "ULTRAMSG_TOKEN", "")
    clean_phone = clean_phone_number(phone)

    url = f"https://api.ultramsg.com/{instance_id}/messages/document"
    payload = {
        "token": token,
        "to": clean_phone,
        "filename": filename,
        "document": f"data:application/pdf;base64,{base64.b64encode(pdf_bytes).decode('utf-8')}",
        "caption": caption,
    }
    headers = {"content-type": "application/x-www-form-urlencoded"}

    try:
        res = requests.post(url, data=payload, headers=headers, timeout=15)
        data = res.json()
        if data.get("sent") == "true" or data.get("id"):
            return {"success": True, "message_id": data.get("id"), "provider": "ultramsg"}
        return {"success": False, "error": data.get("message", "UltraMsg failed")}
    except Exception as e:
        return {"success": False, "error": str(e)}

def send_whatsapp_pdf_document(phone: str, pdf_bytes: bytes, filename: str = "invoice.pdf", caption: str = "Your Official Bill") -> dict:
    """
    Main entry point: Sends the PDF file directly to the customer's WhatsApp number.
    Tries configured providers (Meta Cloud API, UltraMsg, etc.).
    """
    status = is_whatsapp_configured()
    if not status["configured"]:
        return {
            "success": False,
            "configured": False,
            "error": "WhatsApp API credentials are not configured in backend/.env",
            "instructions": "To send PDF files directly to customer WhatsApp numbers, add WHATSAPP_CLOUD_API_TOKEN and WHATSAPP_PHONE_NUMBER_ID to backend/.env",
        }

    provider = status["provider"]
    if provider == "meta":
        return send_via_meta_cloud_api(phone, pdf_bytes, filename, caption)
    elif provider == "ultramsg":
        return send_via_ultramsg(phone, pdf_bytes, filename, caption)

    return {"success": False, "error": "Unknown WhatsApp provider"}

