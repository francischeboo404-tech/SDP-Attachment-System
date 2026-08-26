from django.urls import path
from .views import (
    JobListCreateView,
    JobDetailView,
    ApplicationListCreateView,
    ApplicationDetailView,
    ApplicationStatusUpdateView,
    AnalyticsView,
)

urlpatterns = [
    path("vacancies/", JobListCreateView.as_view(), name="job-list"),
    path("vacancies/<int:pk>/", JobDetailView.as_view(), name="job-detail"),
    path("applications/", ApplicationListCreateView.as_view(), name="application-list"),
    path(
        "applications/<int:pk>/",
        ApplicationDetailView.as_view(),
        name="application-detail",
    ),
    path(
        "applications/<int:pk>/status/",
        ApplicationStatusUpdateView.as_view(),
        name="application-status-update",
    ),
    path("analytics/", AnalyticsView.as_view(), name="analytics"),
]
