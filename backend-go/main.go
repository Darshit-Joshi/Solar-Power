package main

import (
	"fmt"
	"log"
	"os"

	"backend-go/database"
	"backend-go/helpers"
	"backend-go/routes"
	"backend-go/websockets"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	// Load .env file
	err := godotenv.Load()
	if err != nil {
		log.Println("Error loading .env file (might be using environment variables)")
	}

	// Connect to Database
	database.ConnectDB()

	// Start live data simulation
	helpers.StartTelemetrySimulation()

	// Set up Gin router
	r := gin.Default()

	// CORS config
	r.Use(cors.Default())

	// Register Routes
	routes.RegisterRoutes(r)

	// Websocket route
	r.GET("/ws", websockets.ServeWS)

	// Basic route
	r.GET("/", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"message": "Welcome to the Golang backend",
		})
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "5000"
	}

	fmt.Printf("🚀 Server running on port %s\n", port)
	r.Run(":" + port)
}
