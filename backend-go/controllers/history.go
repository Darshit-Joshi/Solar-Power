package controllers

import (
	"context"
	"time"

	"backend-go/database"
	"backend-go/models"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func GetHistory(c *gin.Context) {
	collection := database.GetCollection("readings")

	findOptions := options.Find()
	findOptions.SetSort(bson.D{{"timestamp", -1}})

	cursor, err := collection.Find(context.TODO(), bson.D{}, findOptions)
	if err != nil {
		c.JSON(500, gin.H{"error": "Failed to fetch readings history"})
		return
	}
	defer cursor.Close(context.TODO())

	var readings []models.Reading
	if err = cursor.All(context.TODO(), &readings); err != nil {
		c.JSON(500, gin.H{"error": "Failed to parse readings history"})
		return
	}

	c.JSON(200, readings)
}

func GetHistoricalData(c *gin.Context) {
	collection := database.GetCollection("readings")

	twentyFourHoursAgo := time.Now().Add(-24 * time.Hour)

	filter := bson.M{
		"timestamp": bson.M{"$gte": twentyFourHoursAgo},
	}

	findOptions := options.Find()
	findOptions.SetSort(bson.D{{"timestamp", 1}})

	cursor, err := collection.Find(context.TODO(), filter, findOptions)
	if err != nil {
		c.JSON(500, gin.H{"error": "Failed to fetch history"})
		return
	}
	defer cursor.Close(context.TODO())

	var data []models.Reading
	if err = cursor.All(context.TODO(), &data); err != nil {
		c.JSON(500, gin.H{"error": "Failed to parse history"})
		return
	}

	c.JSON(200, data)
}
