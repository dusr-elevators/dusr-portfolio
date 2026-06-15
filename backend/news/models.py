from django.db import models


class NewsItem(models.Model):
    title = models.CharField(max_length=200)
    description = models.TextField()
    date = models.DateField(null=True, blank=True)
    image = models.ImageField(upload_to='news/', help_text="Image size should be 800x600px for best results")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)
    order = models.IntegerField(default=0, help_text="Order of appearance in the carousel")

    class Meta:
        ordering = ['order', '-created_at']
        verbose_name = 'News Item'
        verbose_name_plural = 'News Items'
        db_table = 'home_newsitem'

    def __str__(self):
        return self.title

# Create your models here.
