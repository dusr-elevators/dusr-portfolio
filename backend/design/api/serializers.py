import base64

from rest_framework import serializers
from ..models import (
    ComponentCategory, ComponentOption, DesignCTASettings, DesignExportSettings,
    DesignLeadSubmission, OptionVariant,
)


class OptionVariantSerializer(serializers.ModelSerializer):
    class Meta:
        model = OptionVariant
        fields = ['depends_on_option', 'projection_image']


class ComponentOptionSerializer(serializers.ModelSerializer):
    variants = OptionVariantSerializer(many=True, read_only=True)

    class Meta:
        model = ComponentOption
        fields = ['id', 'name_ar', 'name_en', 'thumbnail', 'projection_image',
                  'sound_file', 'is_default_selected', 'sort_order', 'variants']


class ComponentCategorySerializer(serializers.ModelSerializer):
    options = serializers.SerializerMethodField()
    icon = serializers.SerializerMethodField()

    class Meta:
        model = ComponentCategory
        fields = ['id', 'name_ar', 'name_en', 'kind', 'layer_order', 'is_required', 'icon',
                  'depends_on_category', 'options']

    def get_icon(self, obj):
        return obj.icon.lucide_name if obj.icon_id else ''

    def get_options(self, obj):
        active_options = getattr(obj, 'active_options', None)
        if active_options is None:
            active_options = obj.options.filter(is_active=True)
        return ComponentOptionSerializer(active_options, many=True, context=self.context).data


class DesignCTASettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = DesignCTASettings
        fields = ['is_visible']


class DesignExportSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = DesignExportSettings
        fields = ['delivery_mode']


# 12 MB of PDF; base64 inflates by ~4/3, so cap the encoded string a little
# above that while staying under nginx's 25 MB request limit.
MAX_PDF_BYTES = 12 * 1024 * 1024
MAX_PDF_B64_CHARS = 17_000_000


class DesignLeadSubmissionSerializer(serializers.ModelSerializer):
    pdf_base64 = serializers.CharField(write_only=True)

    class Meta:
        model = DesignLeadSubmission
        fields = ['full_name', 'email', 'mobile', 'selections_summary', 'design_url', 'pdf_base64']

    def validate_pdf_base64(self, value):
        # The real pre-parse guard is the CONTENT_LENGTH check in the view, which
        # runs before DRF parses the body into memory. This is a secondary bound:
        # by the time we're here the body is already fully parsed, so this only
        # stops an oversize value from also being base64-decoded.
        if len(value) > MAX_PDF_B64_CHARS:
            raise serializers.ValidationError('The design file is too large.')

        try:
            decoded = base64.b64decode(value, validate=True)
        except (ValueError, TypeError):
            raise serializers.ValidationError('The design file could not be decoded.')

        if len(decoded) > MAX_PDF_BYTES:
            raise serializers.ValidationError('The design file is too large.')
        # Without this the endpoint would mail arbitrary attachments from our domain.
        if not decoded.startswith(b'%PDF-'):
            raise serializers.ValidationError('The uploaded file is not a PDF.')

        return value
