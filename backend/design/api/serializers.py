from rest_framework import serializers
from ..models import ComponentCategory, ComponentOption, DesignCTASettings, OptionVariant


class OptionVariantSerializer(serializers.ModelSerializer):
    class Meta:
        model = OptionVariant
        fields = ['depends_on_option', 'projection_image']


class ComponentOptionSerializer(serializers.ModelSerializer):
    variants = OptionVariantSerializer(many=True, read_only=True)

    class Meta:
        model = ComponentOption
        fields = ['id', 'name_ar', 'name_en', 'thumbnail', 'projection_image',
                  'is_default_selected', 'sort_order', 'variants']


class ComponentCategorySerializer(serializers.ModelSerializer):
    options = serializers.SerializerMethodField()
    icon = serializers.SerializerMethodField()

    class Meta:
        model = ComponentCategory
        fields = ['id', 'name_ar', 'name_en', 'layer_order', 'is_required', 'icon',
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
