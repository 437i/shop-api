# ---------- Стадия 1: сборка jar ----------
FROM eclipse-temurin:21-jdk AS build
WORKDIR /build
COPY grpc ./grpc
COPY service_auth ./service_auth
WORKDIR /build/service_auth
RUN --mount=type=cache,target=/root/.gradle \
    chmod +x gradlew && ./gradlew bootJar --no-daemon

# ---------- Стадия 2: рантайм ----------
FROM eclipse-temurin:21-jre AS runtime
WORKDIR /app
RUN useradd --system --uid 10001 app
COPY --from=build /build/service_auth/build/libs/*.jar /app/app.jar
USER app
EXPOSE 50051
ENTRYPOINT ["java", "-jar", "/app/app.jar"]