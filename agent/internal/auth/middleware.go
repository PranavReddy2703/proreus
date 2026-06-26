package auth

import (
	"os"

	"github.com/labstack/echo/v4"
)

func ApiKeyMiddleware() echo.MiddlewareFunc {
	expectedKey := os.Getenv("PROREUS_API_KEY")
	if expectedKey == "" {
		expectedKey = "dev-key" // Default for local dev
	}
	
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			// Skip auth for health endpoint
			if c.Path() == "/api/v1/health" {
				return next(c)
			}
			
			key := c.Request().Header.Get("X-API-Key")
			if key != expectedKey {
				return c.JSON(401, map[string]string{"message": "Unauthorized"})
			}
			return next(c)
		}
	}
}
