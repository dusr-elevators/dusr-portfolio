"""Outbound mail for design lead submissions.

Kept apart from the view so the message bodies can be tested directly and the
view stays about HTTP concerns.
"""

import logging

from django.conf import settings
from django.core.mail import EmailMessage

logger = logging.getLogger(__name__)

PDF_FILENAME = 'dusr-elevator-design.pdf'


def _customer_body_en(lead):
    body = (
        f"Hello {lead.full_name},\n\n"
        "Thank you for designing your elevator cabin with Dusr. Your design is "
        "attached as a PDF.\n\n"
        f"Your chosen components:\n{lead.selections_summary}\n\n"
    )
    if lead.design_url:
        body += f"You can reopen or change your design here:\n{lead.design_url}\n\n"
    return body + "Our team will be in touch shortly.\n\nDusr Elevators\ndusr.sa"


def _customer_body_ar(lead):
    body = (
        f"مرحباً {lead.full_name}،\n\n"
        "شكراً لاستخدامك استوديو تصميم كبينة المصعد من دسر. أرفقنا تصميمك بصيغة PDF.\n\n"
        f"المكونات المختارة:\n{lead.selections_summary}\n\n"
    )
    if lead.design_url:
        body += f"يمكنك فتح التصميم أو تعديله من الرابط التالي:\n{lead.design_url}\n\n"
    return body + "سيتواصل معك فريقنا قريباً.\n\nدسر لأنظمة المصاعد\ndusr.sa"


def _customer_message(lead, pdf_bytes, language='en'):
    is_ar = language == 'ar'
    body = _customer_body_ar(lead) if is_ar else _customer_body_en(lead)

    message = EmailMessage(
        subject='تصميم كبينة المصعد من دسر' if is_ar else 'Your Dusr elevator cabin design',
        body=body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[lead.email],
    )
    message.attach(PDF_FILENAME, pdf_bytes, 'application/pdf')
    return message


def _sales_message(lead, pdf_bytes, language='en'):
    body = (
        "A new elevator cabin design was submitted.\n\n"
        f"Name:   {lead.full_name}\n"
        f"Email:  {lead.email}\n"
        f"Mobile: {lead.mobile}\n"
        f"Language: {'Arabic' if language == 'ar' else 'English'}\n"
        f"Link:   {lead.design_url or '—'}\n\n"
        f"Chosen components:\n{lead.selections_summary}\n"
    )
    message = EmailMessage(
        subject=f'New elevator design lead — {lead.full_name}',
        body=body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[settings.CONTACT_EMAIL],
        reply_to=[lead.email],
    )
    message.attach(PDF_FILENAME, pdf_bytes, 'application/pdf')
    return message


def send_design_emails(lead, pdf_bytes, language='en'):
    """Email the PDF to the customer and notify sales.

    Returns True only if both messages were sent. Never raises: the lead is
    already saved by the time this runs, and losing it because an SMTP server
    is down would be worse than a missing email.
    """
    try:
        _customer_message(lead, pdf_bytes, language=language).send()
        _sales_message(lead, pdf_bytes, language=language).send()
        return True
    except Exception:
        logger.exception('Failed to send design lead emails for lead %s', lead.pk)
        return False
