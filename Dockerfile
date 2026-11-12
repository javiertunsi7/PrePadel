# syntax=docker/dockerfile:1

# Imagen de producción de PrePádel: un solo servidor que sirve la web y la API.
#   docker build -t prepadel .
# Para probarla en tu equipo con su base de datos: docker compose up --build

# 1) La web (React + Vite)
FROM node:24-alpine AS web
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci
COPY frontend/ ./
RUN npm run build

# 2) El servidor (Spring Boot), con la web dentro del jar
FROM eclipse-temurin:25-jdk AS server
WORKDIR /app/backend
COPY backend/.mvn .mvn
COPY backend/mvnw backend/pom.xml ./
COPY backend/src src
COPY --from=web /app/frontend/dist /app/frontend/dist
# Los tests no se repiten aquí: ya los pasa GitHub en cada cambio (.github/workflows/ci.yml).
RUN --mount=type=cache,target=/root/.m2 \
    chmod +x mvnw && ./mvnw -B -ntp -Pweb -DskipTests package \
    && cp target/prepadel-backend-*.jar /app/prepadel.jar

# 3) La imagen que se despliega: solo Java y el jar, con un usuario sin privilegios
FROM eclipse-temurin:25-jre
RUN useradd --system --uid 10001 --no-create-home prepadel
WORKDIR /app
COPY --from=server /app/prepadel.jar prepadel.jar
USER prepadel
# El perfil prod exige PostgreSQL: DATABASE_JDBC_URL, DATABASE_USER y DATABASE_PASSWORD.
ENV SPRING_PROFILES_ACTIVE=prod
EXPOSE 8080
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75", "-jar", "prepadel.jar"]
