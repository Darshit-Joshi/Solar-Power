package helpers

import (
	"context"
	"fmt"
	"math"
	"math/rand"
	"time"

	"backend-go/database"
	"backend-go/models"
	"backend-go/websockets"

	"go.mongodb.org/mongo-driver/bson"
)

func get15MinSlotStart(d time.Time) time.Time {
	m := d.Minute()
	bucket := (m / 15) * 15
	return time.Date(d.Year(), d.Month(), d.Day(), d.Hour(), bucket, 0, 0, d.Location())
}

func saveIfNewSlot(payload *models.Reading) (bool, error) {
	slotStart := get15MinSlotStart(time.Now())

	collection := database.GetCollection("readings")

	var result bson.M
	err := collection.FindOne(context.TODO(), bson.M{"slotStart": slotStart}).Decode(&result)

	if err == nil {
		return false, nil
	}

	payload.SlotStart = slotStart
	payload.Timestamp = time.Now()

	_, insertErr := collection.InsertOne(context.TODO(), payload)
	if insertErr != nil {
		return false, insertErr
	}

	return true, nil
}

func StartTelemetrySimulation() {
	fmt.Println("⚡ Starting Live IoT Telemetry Simulator...")

	ticker := time.NewTicker(3 * time.Second)
	go func() {
		for {
			<-ticker.C

			liveData := models.Reading{
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
				Timestamp:          time.Now(),
			}

			// 1. Send live data to websocket
			websockets.BroadcastTelemetry(liveData)

			// 2. Try saving to DB
			saved, err := saveIfNewSlot(&liveData)
			if err != nil {
				fmt.Println("❌ Live simulation error:", err)
			} else if saved {
				fmt.Printf("💾 Saved new 15-min bucket to DB at %s\n", time.Now().Format(time.Kitchen))
			}
		}
	}()
}
