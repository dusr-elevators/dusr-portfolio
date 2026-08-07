"""Outbound mail for homepage contact submissions."""

import logging

from django.conf import settings
from django.core.mail import EmailMessage

logger = logging.getLogger(__name__)


def _contact_body_en(submission):
    return (
        "A new contact request was submitted from the homepage.\n\n"
        f"Name:   {submission.first_name} {submission.last_name}\n"
        f"Email:  {submission.email}\n"
        f"Phone:  {submission.phone_number}\n"
        f"Department: {submission.project_engineering_department or '-'}\n\n"
        f"Message:\n{submission.message or '-'}\n"
    )


def _contact_body_ar(submission):
    return (
        "تم استلام طلب تواصل جديد من الصفحة الرئيسية.\n\n"
        f"الاسم: {submission.first_name} {submission.last_name}\n"
        f"البريد الإلكتروني: {submission.email}\n"
        f"رقم الجوال: {submission.phone_number}\n"
        f"القسم الهندسي: {submission.project_engineering_department or '-'}\n\n"
        f"تفاصيل الطلب:\n{submission.message or '-'}\n"
    )


def send_contact_submission_email(submission, language='en'):
    """Notify the sales inbox about a homepage contact submission."""
    is_ar = language == 'ar'
    full_name = f"{submission.first_name} {submission.last_name}".strip()

    message = EmailMessage(
        subject=f"{'طلب تواصل جديد' if is_ar else 'New contact request'} - {full_name}",
        body=_contact_body_ar(submission) if is_ar else _contact_body_en(submission),
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[settings.CONTACT_EMAIL],
        reply_to=[submission.email],
    )

    try:
        message.send()
        return True
    except Exception:
        logger.exception('Failed to send contact submission email for submission %s', submission.pk)
        return False
