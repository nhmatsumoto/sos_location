FROM mcr.microsoft.com/dotnet/sdk:10.0-alpine AS build
WORKDIR /src

# Copiar solução e projetos
COPY ["SOSLocation.slnx", "./"]
COPY ["SOSLocation.Domain/SOSLocation.Domain.csproj", "SOSLocation.Domain/"]
COPY ["SOSLocation.Application/SOSLocation.Application.csproj", "SOSLocation.Application/"]
COPY ["SOSLocation.Infrastructure/SOSLocation.Infrastructure.csproj", "SOSLocation.Infrastructure/"]
COPY ["SOSLocation.API/SOSLocation.API.csproj", "SOSLocation.API/"]
COPY ["Directory.Build.props", "./"]

# Restaurar
RUN dotnet restore -p:AllowMissingPrunePackageData=true

# Buildar
COPY . .
RUN dotnet build "SOSLocation.slnx" -c Release

FROM build AS publish
RUN dotnet publish "SOSLocation.API/SOSLocation.API.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0-alpine AS final
RUN apk add --no-cache curl krb5-libs
WORKDIR /app
EXPOSE 8000
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "SOSLocation.API.dll"]
