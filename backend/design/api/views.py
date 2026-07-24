from rest_framework.response import Response
from rest_framework.views import APIView

from ..models import DesignCTASettings, DesignExportSettings
from .serializers import DesignCTASettingsSerializer, DesignExportSettingsSerializer


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
