"""
Thunderbolt Pro Tools - HTTP endpoints for the MCP tools
"""

import logging
import sys
import traceback
from datetime import datetime
from typing import Any

import httpx
from fastapi import FastAPI
from pydantic import BaseModel


# Request/Response models
class SearchRequest(BaseModel):
    query: str
    max_results: int = 10


class SearchResponse(BaseModel):
    results: str
    success: bool
    error: str | None = None


class FetchContentRequest(BaseModel):
    url: str


class FetchContentResponse(BaseModel):
    content: str
    success: bool
    error: str | None = None


class WeatherRequest(BaseModel):
    lat: float
    lng: float
    days: int = 3  # Only used for forecast


class WeatherResponse(BaseModel):
    weather_data: str
    success: bool
    error: str | None = None


class LocationSearchRequest(BaseModel):
    query: str


class LocationSearchResponse(BaseModel):
    locations: str
    success: bool
    error: str | None = None


# Simple context class to replace MCP Context
class SimpleContext:
    def __init__(self):
        self.logger = logging.getLogger(__name__)

    async def info(self, message: str):
        self.logger.info(message)

    async def error(self, message: str):
        self.logger.error(message)


class DuckDuckGoSearcher:
    """Simple DuckDuckGo searcher implementation"""

    def __init__(self):
        self.base_url = "https://api.duckduckgo.com/"

    async def search(
        self, query: str, ctx: SimpleContext, max_results: int = 10
    ) -> list[dict[str, Any]]:
        """Search DuckDuckGo and return results"""
        await ctx.info(f"Searching DuckDuckGo for: {query}")

        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    self.base_url,
                    params={
                        "q": query,
                        "format": "json",
                        "no_html": "1",
                        "skip_disambig": "1",
                    },
                    timeout=30.0,
                )
                response.raise_for_status()
                data = response.json()

                # Extract relevant results
                results = []
                for topic in data.get("RelatedTopics", [])[:max_results]:
                    if isinstance(topic, dict) and "Text" in topic:
                        results.append(
                            {
                                "title": topic.get("Text", "")[:100] + "..."
                                if len(topic.get("Text", "")) > 100
                                else topic.get("Text", ""),
                                "snippet": topic.get("Text", ""),
                                "url": topic.get("FirstURL", ""),
                            }
                        )

                return results

        except Exception as e:
            await ctx.error(f"Error searching DuckDuckGo: {str(e)}")
            return []

    def format_results_for_llm(self, results: list[dict[str, Any]]) -> str:
        """Format search results for LLM consumption"""
        if not results:
            return "No search results found."

        formatted = ["Search Results:\n"]
        for i, result in enumerate(results, 1):
            formatted.append(f"{i}. {result.get('title', 'No title')}")
            if result.get("snippet"):
                formatted.append(f"   {result['snippet']}")
            if result.get("url"):
                formatted.append(f"   URL: {result['url']}")
            formatted.append("")

        return "\n".join(formatted)


class WebContentFetcher:
    """Simple web content fetcher implementation"""

    async def fetch_and_parse(self, url: str, ctx: SimpleContext) -> str:
        """Fetch and parse content from a webpage URL"""
        await ctx.info(f"Fetching content from: {url}")

        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    url,
                    timeout=30.0,
                    follow_redirects=True,
                    headers={
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
                    },
                )
                response.raise_for_status()

                # Simple text extraction - just return the content
                content = response.text

                # Basic cleanup
                if len(content) > 5000:
                    content = content[:5000] + "... (content truncated)"

                return f"Content from {url}:\n\n{content}"

        except Exception as e:
            await ctx.error(f"Error fetching content: {str(e)}")
            return f"Error: Could not fetch content from {url} ({str(e)})"


class OpenMeteoWeather:
    """Client for interacting with Open-Meteo weather API."""

    BASE_URL = "https://api.open-meteo.com/v1"
    GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1"

    async def search_locations(
        self, query: str, ctx: SimpleContext, count: int = 10
    ) -> list[dict[str, Any]]:
        """Search for locations using Open-Meteo geocoding API."""
        await ctx.info(f"Searching for locations matching: {query}")

        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.GEOCODING_URL}/search",
                    params={
                        "name": query,
                        "count": count,
                        "language": "en",
                        "format": "json",
                    },
                    timeout=30.0,
                )
                response.raise_for_status()
                data = response.json()

                locations = data.get("results", [])
                await ctx.info(f"Found {len(locations)} locations matching '{query}'")
                return locations

        except httpx.HTTPError as e:
            await ctx.error(f"HTTP error searching locations: {str(e)}")
            return []
        except Exception as e:
            await ctx.error(f"Error searching locations: {str(e)}")
            traceback.print_exc(file=sys.stderr)
            return []

    async def get_current_weather(
        self, lat: float, lng: float, ctx: SimpleContext
    ) -> str:
        """Get current weather for specified coordinates."""
        await ctx.info(f"Fetching current weather for coordinates: {lat}, {lng}")

        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.BASE_URL}/forecast",
                    params={
                        "latitude": lat,
                        "longitude": lng,
                        "current": "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,cloud_cover,pressure_msl,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m",
                        "timezone": "auto",
                    },
                    timeout=30.0,
                )
                response.raise_for_status()
                data = response.json()

            current = data.get("current", {})

            result = []
            result.append(f"Current weather for coordinates ({lat}, {lng}):")
            result.append("")
            result.append(
                f"Temperature: {current.get('temperature_2m')}°C (feels like {current.get('apparent_temperature')}°C)"
            )
            result.append(f"Humidity: {current.get('relative_humidity_2m')}%")
            result.append(f"Cloud cover: {current.get('cloud_cover')}%")
            result.append(f"Precipitation: {current.get('precipitation')} mm")
            result.append(f"Pressure: {current.get('pressure_msl')} hPa")
            result.append(f"Wind: {current.get('wind_speed_10m')} km/h")

            weather_code = current.get("weather_code", 0)
            result.append(f"Conditions: {self._get_weather_description(weather_code)}")

            return "\n".join(result)

        except httpx.HTTPError as e:
            await ctx.error(f"HTTP error getting current weather: {str(e)}")
            return f"Error: Could not fetch current weather data ({str(e)})"
        except Exception as e:
            await ctx.error(f"Error getting current weather: {str(e)}")
            traceback.print_exc(file=sys.stderr)
            return f"Error: An unexpected error occurred while fetching current weather data ({str(e)})"

    async def get_weather_forecast(
        self, lat: float, lng: float, days: int, ctx: SimpleContext
    ) -> str:
        """Get weather forecast for specified coordinates."""
        await ctx.info(f"Fetching {days}-day forecast for coordinates: {lat}, {lng}")

        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.BASE_URL}/forecast",
                    params={
                        "latitude": lat,
                        "longitude": lng,
                        "daily": "weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max",
                        "timezone": "auto",
                        "forecast_days": days,
                    },
                    timeout=30.0,
                )
                response.raise_for_status()
                data = response.json()

            daily = data.get("daily", {})

            # Format the forecast
            result = []
            result.append(
                f"{days}-day weather forecast for coordinates ({lat}, {lng}):"
            )
            result.append("")

            dates = daily.get("time", [])
            for i in range(min(len(dates), days)):
                date = dates[i]
                weather_code = (
                    daily["weather_code"][i]
                    if i < len(daily.get("weather_code", []))
                    else 0
                )

                result.append(f"{self._format_date(date)}:")
                result.append(
                    f"  Conditions: {self._get_weather_description(weather_code)}"
                )
                result.append(
                    f"  High: {daily['temperature_2m_max'][i]}°C (feels like {daily['apparent_temperature_max'][i]}°C)"
                )
                result.append(
                    f"  Low: {daily['temperature_2m_min'][i]}°C (feels like {daily['apparent_temperature_min'][i]}°C)"
                )

                precip = daily["precipitation_sum"][i]
                precip_prob = daily["precipitation_probability_max"][i]
                if precip > 0 or precip_prob > 0:
                    result.append(
                        f"  Precipitation: {precip} mm (probability: {precip_prob}%)"
                    )

                result.append(f"  Max wind: {daily['wind_speed_10m_max'][i]} km/h")
                result.append("")

            return "\n".join(result)

        except httpx.HTTPError as e:
            await ctx.error(f"HTTP error getting forecast: {str(e)}")
            return f"Error: Could not fetch forecast data ({str(e)})"
        except Exception as e:
            await ctx.error(f"Error getting forecast: {str(e)}")
            traceback.print_exc(file=sys.stderr)
            return f"Error: An unexpected error occurred while fetching forecast data ({str(e)})"

    def _get_weather_description(self, code: int) -> str:
        """Convert WMO weather code to description."""
        weather_codes = {
            0: "Clear sky",
            1: "Mainly clear",
            2: "Partly cloudy",
            3: "Overcast",
            45: "Foggy",
            48: "Depositing rime fog",
            51: "Light drizzle",
            53: "Moderate drizzle",
            55: "Dense drizzle",
            56: "Light freezing drizzle",
            57: "Dense freezing drizzle",
            61: "Slight rain",
            63: "Moderate rain",
            65: "Heavy rain",
            66: "Light freezing rain",
            67: "Heavy freezing rain",
            71: "Slight snow fall",
            73: "Moderate snow fall",
            75: "Heavy snow fall",
            77: "Snow grains",
            80: "Slight rain showers",
            81: "Moderate rain showers",
            82: "Violent rain showers",
            85: "Slight snow showers",
            86: "Heavy snow showers",
            95: "Thunderstorm",
            96: "Thunderstorm with slight hail",
            99: "Thunderstorm with heavy hail",
        }
        return weather_codes.get(code, f"Unknown (code {code})")

    def _format_date(self, date_str: str) -> str:
        """Format date string to be more readable."""
        try:
            date = datetime.fromisoformat(date_str)
            return date.strftime("%A, %B %d")
        except:
            return date_str


# Initialize the tool clients
searcher = DuckDuckGoSearcher()
fetcher = WebContentFetcher()
weather_client = OpenMeteoWeather()


def create_pro_tools_app() -> FastAPI:
    """Create FastAPI app with pro tools endpoints"""
    app = FastAPI(title="Thunderbolt Pro Tools", version="1.0.0")

    @app.post("/search", response_model=SearchResponse)
    async def search_endpoint(request: SearchRequest) -> SearchResponse:
        """Search DuckDuckGo and return formatted results"""
        try:
            ctx = SimpleContext()
            results = await searcher.search(request.query, ctx, request.max_results)
            formatted = searcher.format_results_for_llm(results)

            return SearchResponse(results=formatted, success=True)
        except Exception as e:
            return SearchResponse(results="", success=False, error=str(e))

    @app.post("/fetch-content", response_model=FetchContentResponse)
    async def fetch_content_endpoint(
        request: FetchContentRequest,
    ) -> FetchContentResponse:
        """Fetch and parse content from a webpage URL"""
        try:
            ctx = SimpleContext()
            content = await fetcher.fetch_and_parse(request.url, ctx)

            return FetchContentResponse(content=content, success=True)
        except Exception as e:
            return FetchContentResponse(content="", success=False, error=str(e))

    @app.post("/weather/current", response_model=WeatherResponse)
    async def current_weather_endpoint(request: WeatherRequest) -> WeatherResponse:
        """Get current weather for specified coordinates"""
        try:
            ctx = SimpleContext()
            weather_data = await weather_client.get_current_weather(
                request.lat, request.lng, ctx
            )

            return WeatherResponse(weather_data=weather_data, success=True)
        except Exception as e:
            return WeatherResponse(weather_data="", success=False, error=str(e))

    @app.post("/weather/forecast", response_model=WeatherResponse)
    async def weather_forecast_endpoint(request: WeatherRequest) -> WeatherResponse:
        """Get weather forecast for specified coordinates"""
        try:
            ctx = SimpleContext()
            weather_data = await weather_client.get_weather_forecast(
                request.lat, request.lng, request.days, ctx
            )

            return WeatherResponse(weather_data=weather_data, success=True)
        except Exception as e:
            return WeatherResponse(weather_data="", success=False, error=str(e))

    @app.post("/locations/search", response_model=LocationSearchResponse)
    async def search_locations_endpoint(
        request: LocationSearchRequest,
    ) -> LocationSearchResponse:
        """Search for locations by name"""
        try:
            ctx = SimpleContext()
            locations = await weather_client.search_locations(request.query, ctx)

            if not locations:
                locations_str = f"No locations found matching: {request.query}"
            else:
                # Format the results as a string (same as MCP tool)
                result = []
                result.append(
                    f"Found {len(locations)} locations matching '{request.query}':"
                )
                result.append("")

                for i, location in enumerate(locations, 1):
                    # Build location string
                    location_parts = [location["name"]]
                    if location.get("admin1"):
                        location_parts.append(location["admin1"])
                    if location.get("country"):
                        location_parts.append(location["country"])

                    location_str = ", ".join(location_parts)

                    result.append(f"{i}. {location_str}")
                    result.append(
                        f"   Coordinates: {location['latitude']}, {location['longitude']}"
                    )
                    if location.get("elevation") is not None:
                        result.append(f"   Elevation: {location['elevation']}m")
                    result.append("")

                locations_str = "\n".join(result).strip()

            return LocationSearchResponse(locations=locations_str, success=True)
        except Exception as e:
            return LocationSearchResponse(locations="", success=False, error=str(e))

    return app
