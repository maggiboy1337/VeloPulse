FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 8080

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY ["backend/LiveTracking.Api/LiveTracking.Api.csproj", "backend/LiveTracking.Api/"]
COPY ["backend/LiveTracking.Application/LiveTracking.Application.csproj", "backend/LiveTracking.Application/"]
COPY ["backend/LiveTracking.Domain/LiveTracking.Domain.csproj", "backend/LiveTracking.Domain/"]
COPY ["backend/LiveTracking.Infrastructure/LiveTracking.Infrastructure.csproj", "backend/LiveTracking.Infrastructure/"]

RUN dotnet restore "backend/LiveTracking.Api/LiveTracking.Api.csproj"

COPY backend/ backend/

WORKDIR "/src/backend/LiveTracking.Api"
RUN dotnet build "LiveTracking.Api.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "LiveTracking.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "LiveTracking.Api.dll"]
