package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Reading struct {
	ID                 primitive.ObjectID `bson:"_id,omitempty" json:"id,omitempty"`
	SlotStart          time.Time          `bson:"slotStart,omitempty" json:"slotStart,omitempty"`
	DeviceID           int                `bson:"device_id,omitempty" json:"device_id,omitempty"`
	DeviceState        int                `bson:"device_state,omitempty" json:"device_state,omitempty"`
	FwVersion          int                `bson:"fw_version,omitempty" json:"fw_version,omitempty"`
	Temperature        float64            `bson:"temperature,omitempty" json:"temperature,omitempty"`
	Humidity           float64            `bson:"humidity,omitempty" json:"humidity,omitempty"`
	VoltageBattery     float64            `bson:"voltage_battery,omitempty" json:"voltage_battery,omitempty"`
	VoltageSolarPanel  float64            `bson:"voltage_solar_panel,omitempty" json:"voltage_solar_panel,omitempty"`
	RunningCurrent     float64            `bson:"running_current,omitempty" json:"running_current,omitempty"`
	AvgCurrent         float64            `bson:"avg_current,omitempty" json:"avg_current,omitempty"`
	MotorSpeed         float64            `bson:"motor_speed,omitempty" json:"motor_speed,omitempty"`
	PanelLocation      int                `bson:"panel_location,omitempty" json:"panel_location,omitempty"`
	BatteryPercentage  float64            `bson:"battery_percentage,omitempty" json:"battery_percentage,omitempty"`
	ConnectivityStatus int                `bson:"connectivity_status,omitempty" json:"connectivity_status,omitempty"`
	ErrorCode          int                `bson:"error_code,omitempty" json:"error_code,omitempty"`
	TotalRuntime       float64            `bson:"total_runtime,omitempty" json:"total_runtime,omitempty"`
	DbgAccelOutput     float64            `bson:"dbg_accel_output,omitempty" json:"dbg_accel_output,omitempty"`
	DbgGyroOutput      float64            `bson:"dbg_gyro_output,omitempty" json:"dbg_gyro_output,omitempty"`
	DbgMotorStatus0    int                `bson:"dbg_motor_status_0,omitempty" json:"dbg_motor_status_0,omitempty"`
	DbgMotorStatus1    int                `bson:"dbg_motor_status_1,omitempty" json:"dbg_motor_status_1,omitempty"`
	GeneralStatus      int                `bson:"general_status,omitempty" json:"general_status,omitempty"`
	Timestamp          time.Time          `bson:"timestamp,omitempty" json:"timestamp,omitempty"`
}
