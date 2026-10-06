package helpers

import (
	"bytes"
	"encoding/binary"
	"fmt"
	"io/ioutil"
	"os"
	"path/filepath"
	"time"

	"backend-go/models"
	"github.com/jlaffaye/ftp"
)

func DownloadDatFile(remoteFileName string) (string, error) {
	ftpHost := os.Getenv("FTP_HOST")
	ftpUser := os.Getenv("FTP_USER")
	ftpPass := os.Getenv("FTP_PASS")
	ftpDir := os.Getenv("FTP_DIR")

	c, err := ftp.Dial(ftpHost+":21", ftp.DialWithTimeout(5*time.Second))
	if err != nil {
		return "", err
	}
	defer c.Quit()

	err = c.Login(ftpUser, ftpPass)
	if err != nil {
		return "", err
	}

	if ftpDir != "" {
		err = c.ChangeDir(ftpDir)
		if err != nil {
			return "", err
		}
	}

	r, err := c.Retr(remoteFileName)
	if err != nil {
		return "", err
	}
	defer r.Close()

	buf, err := ioutil.ReadAll(r)
	if err != nil {
		return "", err
	}

	localPath := filepath.Join(".", remoteFileName)
	err = ioutil.WriteFile(localPath, buf, 0644)
	if err != nil {
		return "", err
	}

	return localPath, nil
}

func ParseDatFile(filePath string) (*models.Reading, error) {
	buf, err := ioutil.ReadFile(filePath)
	if err != nil {
		return nil, err
	}

	if len(buf) < 50 {
		return nil, fmt.Errorf("file too small or corrupt")
	}

	var deviceID uint32
	var deviceState uint8
	var fwVersion uint8
	var temp uint16
	var humidity uint16
	var voltBatt uint16
	var voltSolar uint16
	var runCurr uint16
	var avgCurr uint16
	var motorSpeed uint16
	var panelLoc uint16
	var battPct uint8
	var connStat uint8
	var errCode uint32
	var totalRun uint32
	var dbgAccel uint32
	var dbgGyro uint32
	var dbgM0 uint32
	var dbgM1 uint32
	var genStat uint16

	binary.Read(bytes.NewReader(buf[0:4]), binary.LittleEndian, &deviceID)
	deviceState = buf[4]
	fwVersion = buf[5]
	binary.Read(bytes.NewReader(buf[6:8]), binary.LittleEndian, &temp)
	binary.Read(bytes.NewReader(buf[8:10]), binary.LittleEndian, &humidity)
	binary.Read(bytes.NewReader(buf[10:12]), binary.LittleEndian, &voltBatt)
	binary.Read(bytes.NewReader(buf[12:14]), binary.LittleEndian, &voltSolar)
	binary.Read(bytes.NewReader(buf[14:16]), binary.LittleEndian, &runCurr)
	binary.Read(bytes.NewReader(buf[16:18]), binary.LittleEndian, &avgCurr)
	binary.Read(bytes.NewReader(buf[18:20]), binary.LittleEndian, &motorSpeed)
	binary.Read(bytes.NewReader(buf[20:22]), binary.LittleEndian, &panelLoc)
	battPct = buf[22]
	connStat = buf[23]
	binary.Read(bytes.NewReader(buf[24:28]), binary.LittleEndian, &errCode)
	binary.Read(bytes.NewReader(buf[28:32]), binary.LittleEndian, &totalRun)
	binary.Read(bytes.NewReader(buf[32:36]), binary.LittleEndian, &dbgAccel)
	binary.Read(bytes.NewReader(buf[36:40]), binary.LittleEndian, &dbgGyro)
	binary.Read(bytes.NewReader(buf[40:44]), binary.LittleEndian, &dbgM0)
	binary.Read(bytes.NewReader(buf[44:48]), binary.LittleEndian, &dbgM1)
	binary.Read(bytes.NewReader(buf[48:50]), binary.LittleEndian, &genStat)

	reading := models.Reading{
		DeviceID:           int(deviceID),
		DeviceState:        int(deviceState),
		FwVersion:          int(fwVersion),
		Temperature:        float64(temp) / 100.0,
		Humidity:           float64(humidity) / 100.0,
		VoltageBattery:     float64(voltBatt),
		VoltageSolarPanel:  float64(voltSolar),
		RunningCurrent:     float64(runCurr),
		AvgCurrent:         float64(avgCurr),
		MotorSpeed:         float64(motorSpeed) / 100.0,
		PanelLocation:      int(panelLoc),
		BatteryPercentage:  float64(battPct),
		ConnectivityStatus: int(connStat),
		ErrorCode:          int(errCode),
		TotalRuntime:       float64(totalRun),
		DbgAccelOutput:     float64(dbgAccel),
		DbgGyroOutput:      float64(dbgGyro),
		DbgMotorStatus0:    int(dbgM0),
		DbgMotorStatus1:    int(dbgM1),
		GeneralStatus:      int(genStat),
		Timestamp:          time.Now(),
	}

	return &reading, nil
}
