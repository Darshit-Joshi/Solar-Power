package controllers

import (
	"context"

	"backend-go/database"
	"backend-go/helpers"

	"github.com/gin-gonic/gin"
)

func GetLatestMachine(c *gin.Context) {
	// Downloads and parses real dat file from FTP
	filePath, err := helpers.DownloadDatFile("solar_panel_6.dat")
	if err != nil {
		c.JSON(500, gin.H{"error": "Failed to fetch .dat file", "details": err.Error()})
		return
	}

	parsedData, err := helpers.ParseDatFile(filePath)
	if err != nil {
		c.JSON(500, gin.H{"error": "Failed to parse .dat file", "details": err.Error()})
		return
	}

	// Save to DB
	collection := database.GetCollection("readings")
	_, err = collection.InsertOne(context.TODO(), parsedData)
	if err != nil {
		c.JSON(500, gin.H{"error": "Failed to save parsed data", "details": err.Error()})
		return
	}

	c.JSON(200, parsedData)
}
