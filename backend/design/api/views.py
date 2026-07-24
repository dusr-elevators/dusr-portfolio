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


class DesignLeadSubmissionView(APIView):
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'design_lead'

    def post(self, request):
        serializer = DesignLeadSubmissionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        pdf_bytes = base64.b64decode(serializer.validated_data.pop('pdf_base64'))

        # Save before sending: a mail failure must never cost us the lead.
        lead = DesignLeadSubmission.objects.create(**serializer.validated_data)
        email_sent = send_design_emails(lead, pdf_bytes)

        return Response({'email_sent': email_sent}, status=status.HTTP_201_CREATED)
