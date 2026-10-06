package database

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var Client *mongo.Client

func ConnectDB() {
	mongoURI := os.Getenv("MONGO_URI")
	if mongoURI == "" {
		log.Fatal("MONGO_URI not found in .env file")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	clientOptions := options.Client().ApplyURI(mongoURI)
	client, err := mongo.Connect(ctx, clientOptions)
	if err != nil {
		log.Fatalf("MongoDB connection failed: %v", err)
	}

	err = client.Ping(ctx, nil)
	if err != nil {
		log.Fatalf("MongoDB ping failed: %v", err)
	}

	fmt.Println("MongoDB connected successfully")
	Client = client
}

func GetCollection(collectionName string) *mongo.Collection {
	return Client.Database("test").Collection(collectionName)
}
