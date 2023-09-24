FROM clojure:latest as build

WORKDIR /

COPY src ./src
COPY deps.edn deps.edn
COPY build.clj build.clj

RUN clj -T:build uber

FROM eclipse-temurin:17

WORKDIR /

COPY --from=build target/hndata-standalone.jar /

ENTRYPOINT ["java", "-jar", "hndata-standalone.jar"]