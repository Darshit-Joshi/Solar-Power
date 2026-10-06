package controllers

import (
	"context"
	"math"
	"math/rand"
	"time"

	"backend-go/database"
	"backend-go/models"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
)

func get15MinSlotStart(d time.Time) time.Time {
	m := d.Minute()
	bucket := (m / 15) * 15
	return time.Date(d.Year(), d.Month(), d.Day(), d.Hour(), bucket, 0, 0, d.Location())
}

func GetFakeData(c *gin.Context) {
	now := time.Now()
	slotStart := get15MinSlotStart(now)

	collection := database.GetCollection("readings")

	// Check if slot exists
	var result bson.M
	err := collection.FindOne(context.TODO(), bson.M{"slotStart": slotStart}).Decode(&result)

	fakeData := models.Reading{
		DeviceID:           4132004,
		DeviceState:        rand.Intn(5),
		FwVersion:          rand.Intn(100),
		Temperature:        math.Round((28+rand.Float64()*4)*100) / 100,
		Humidity:           math.Round((65+rand.Float64()*10)*100) / 100,
		VoltageBattery:     math.Round(1100 + rand.Float64()*100),
		VoltageSolarPanel:  math.Round(2400 + rand.Float64()*200),
		RunningCurrent:     math.Round(120 + rand.Float64()*10),
		AvgCurrent:         math.Round(110 + rand.Float64()*15),
		MotorSpeed:         math.Round((rand.Float64()*0.1)*100) / 100,
		PanelLocation:      10 + rand.Intn(5),
		BatteryPercentage:  float64(rand.Intn(101)),
		ConnectivityStatus: rand.Intn(2),
		ErrorCode:          rand.Intn(10),
		TotalRuntime:       float64(30 + rand.Intn(20)),
		DbgAccelOutput:     rand.Float64() * 5000000000,
		DbgGyroOutput:      rand.Float64() * 5000000000,
		DbgMotorStatus0:    rand.Intn(2),
		DbgMotorStatus1:    rand.Intn(2),
		GeneralStatus:      rand.Intn(5),
		Timestamp:          now,
	}

	if err != nil {
		// Not found, cache MISS -> save new record
		fakeData.SlotStart = slotStart
		_, insertErr := collection.InsertOne(context.TODO(), fakeData)
		if insertErr != nil {
			c.JSON(500, gin.H{"error": "Internal Server Error"})
			return
		}
	}

	c.JSON(200, fakeData)
}
