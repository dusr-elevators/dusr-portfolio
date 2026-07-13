from rest_framework.response import Response
from rest_framework.views import APIView

from ..models import DesignCTASettings
from .serializers import DesignCTASettingsSerializer


class DesignCTASettingsView(APIView):
    def get(self, request):
        settings_obj, _created = DesignCTASettings.objects.get_or_create(pk=1)
        serializer = DesignCTASettingsSerializer(settings_obj)
        return Response(serializer.data)
