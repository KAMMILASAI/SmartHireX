FROM eclipse-temurin:17-jdk-alpine
WORKDIR /app
COPY . .
RUN chmod +x mvnw && sed -i 's/\r$//' mvnw && ./mvnw clean package -DskipTests
CMD ["sh", "-c", "java -jar target/*.jar"]