# ---- Build stage ----
FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /app

COPY mvnw pom.xml ./
COPY .mvn .mvn
RUN chmod +x mvnw && ./mvnw dependency:go-offline -B

COPY src src
RUN ./mvnw package -DskipTests -B

# ---- Runtime stage ----
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

RUN addgroup -S dms && adduser -S dms -G dms
RUN mkdir -p uploads logs && chown -R dms:dms /app
USER dms

COPY --from=build /app/target/*.jar app.jar

EXPOSE 9090

HEALTHCHECK --interval=30s --timeout=10s --start-period=120s --retries=10 \
  CMD wget -qO- http://localhost:9090/actuator/health || exit 1

ENTRYPOINT ["java", \
  "-Djava.security.egd=file:/dev/./urandom", \
  "-Dspring.profiles.active=${SPRING_PROFILES_ACTIVE:-production}", \
  "-jar", "app.jar"]
