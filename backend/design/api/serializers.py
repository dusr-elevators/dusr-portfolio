from rest_framework import serializers
from ..models import ComponentCategory, ComponentOption


class ComponentOptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ComponentOption
        fields = ['id', 'name_ar', 'name_en', 'thumbnail', 'projection_image', 'sort_order']


class ComponentCategorySerializer(serializers.ModelSerializer):
    options = serializers.SerializerMethodField()

    class Meta:
        model = ComponentCategory
        fields = ['id', 'name_ar', 'name_en', 'layer_order', 'is_required', 'icon', 'options']

    def get_options(self, obj):
        active_options = obj.options.filter(is_active=True)
        return ComponentOptionSerializer(active_options, many=True, context=self.context).data
