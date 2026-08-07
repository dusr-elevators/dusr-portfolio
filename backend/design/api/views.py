import base64

from rest_framework import status
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from ..models import DesignCTASettings, DesignExportSettings, DesignLeadSubmission
from .emails import send_design_emails
from .serializers import (
    DesignCTASettingsSerializer, DesignExportSettingsSerializer, DesignLeadSubmissionSerializer,
)


class DesignCTASettingsView(APIView):
    def get(self, request):
        settings_obj, _created = DesignCTASettings.objects.get_or_create(pk=1)
        serializer = DesignCTASettingsSerializer(settings_obj)
        return Response(serializer.data)


class DesignExportSettingsView(APIView):
    def get(self, request):
        settings_obj, _created = DesignExportSettings.objects.get_or_create(pk=1)
        serializer = DesignExportSettingsSerializer(settings_obj)
        return Response(serializer.data)


# A little above the ~17 MB base64 budget (MAX_PDF_B64_CHARS) plus room for the
# JSON envelope and the other fields. This is the pre-parse guard: it is checked
# from CONTENT_LENGTH before request.data is touched, so an oversize upload is
# rejected before DRF's JSONParser reads and parses the whole body into memory.
MAX_REQUEST_BYTES = 18 * 1024 * 1024


class DesignLeadSubmissionView(APIView):
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'design_lead'

    def post(self, request):
        content_length = request.META.get('CONTENT_LENGTH')
        if content_length is not None:
            try:
                content_length = int(content_length)
            except (TypeError, ValueError):
                content_length = None
            if content_length is not None and content_length > MAX_REQUEST_BYTES:
                return Response(
                    {'detail': 'The request body is too large.'},
                    status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                )

        serializer = DesignLeadSubmissionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        pdf_bytes = base64.b64decode(serializer.validated_data.pop('pdf_base64'))

        # Save before sending: a mail failure must never cost us the lead.
        lead = DesignLeadSubmission.objects.create(**serializer.validated_data)
        email_sent = send_design_emails(lead, pdf_bytes)

        return Response({'email_sent': email_sent}, status=status.HTTP_201_CREATED)
