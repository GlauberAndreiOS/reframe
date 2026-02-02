# Use the official .NET SDK image for building the application
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copy the project file and restore dependencies
COPY ["reframe.csproj", "./"]
RUN dotnet restore "reframe.csproj"

# Copy the rest of the source code
COPY . .

# Build the application
RUN dotnet build "reframe.csproj" -c Release -o /app/build

# Publish the application
FROM build AS publish
RUN dotnet publish "reframe.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Use the official ASP.NET Core runtime image for the final stage
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
EXPOSE 8080

# Copy the published application from the build stage
COPY --from=publish /app/publish .

# Set the entry point for the application
ENTRYPOINT ["dotnet", "reframe.dll"]
