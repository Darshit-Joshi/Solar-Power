package controllers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
)

const ModelName = "llama-3.1-8b-instant"

func GenerateDiagnostic(c *gin.Context) {
	var body struct {
		HealthStatus  string                 `json:"healthStatus"`
		Metrics       map[string]interface{} `json:"metrics"`
		RecentAnomaly string                 `json:"recentAnomaly"`
	}

	if err := c.BindJSON(&body); err != nil {
		c.JSON(400, gin.H{"error": "Invalid request"})
		return
	}

	mlAnomalyStatus := body.RecentAnomaly
	if mlAnomalyStatus == "" && body.Metrics != nil {
		mlServiceUrl := os.Getenv("ML_SERVICE_URL")
		if mlServiceUrl == "" {
			mlServiceUrl = "http://localhost:8000"
		}

		mlReqBody, _ := json.Marshal(map[string]interface{}{
			"timestamp":   "2023-01-01T00:00:00Z",
			"voltage":     body.Metrics["voltage"],
			"current":     body.Metrics["current"],
			"power":       body.Metrics["power"],
			"temperature": body.Metrics["temperature"],
			"irradiance":  body.Metrics["irradiance"],
		})

		resp, err := http.Post(mlServiceUrl+"/api/predict/status", "application/json", bytes.NewBuffer(mlReqBody))
		if err == nil {
			var resData map[string]interface{}
			json.NewDecoder(resp.Body).Decode(&resData)
			if status, ok := resData["status"].(string); ok {
				mlAnomalyStatus = status
			}
			resp.Body.Close()
		}
	}

	prompt := fmt.Sprintf(`You are a Chief AI Engineer for an industrial Solar Plant Monitoring System. 
Analyze the following real-time telemetry data and provide a concise, professional 2-3 sentence diagnostic recommendation. 

System State: %v
Battery: %v%%
Temperature: %v°C
Motor Speed: %v RPM
Connectivity: %v
Error Code: %v
Recent Anomaly Status: %v

Provide actionable advice based ONLY on these metrics. Do not use markdown formatting like bolding or asterisks. Keep it strictly to the point.`,
		body.HealthStatus,
		body.Metrics["battery_percentage"],
		body.Metrics["temperature"],
		body.Metrics["motor_speed"],
		body.Metrics["connectivity_status"],
		body.Metrics["error_code"],
		mlAnomalyStatus,
	)

	recommendation, err := callGroq(prompt, 0.2)
	if err != nil {
		c.JSON(500, gin.H{"error": "Failed to generate AI diagnostic."})
		return
	}

	c.JSON(200, gin.H{"recommendation": recommendation})
}

func TroubleshootAlert(c *gin.Context) {
	var body struct {
		AlertTitle  string `json:"alertTitle"`
		Description string `json:"description"`
	}

	if err := c.BindJSON(&body); err != nil {
		c.JSON(400, gin.H{"error": "Invalid request"})
		return
	}

	prompt := fmt.Sprintf(`You are an expert Solar Plant Maintenance Technician. 
A system alert has been triggered.

Alert Title: %s
Description: %s

Provide a fast, step-by-step troubleshooting guide (maximum 3 steps) to resolve this specific issue. Keep it highly technical but brief. Do not use asterisks or markdown bolding.`, body.AlertTitle, body.Description)

	guide, err := callGroq(prompt, 0.1)
	if err != nil {
		c.JSON(500, gin.H{"error": "Failed to generate AI troubleshooting guide."})
		return
	}

	c.JSON(200, gin.H{"guide": guide})
}

func callGroq(prompt string, temperature float64) (string, error) {
	apiKey := os.Getenv("GROQ_API_KEY")
	reqBody := map[string]interface{}{
		"model":       ModelName,
		"messages":    []map[string]string{{"role": "user", "content": prompt}},
		"temperature": temperature,
	}
	jsonBody, _ := json.Marshal(reqBody)

	req, _ := http.NewRequest("POST", "https://api.groq.com/openai/v1/chat/completions", bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+apiKey)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return "", fmt.Errorf("groq API error: %d", resp.StatusCode)
	}

	var resData struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}

	json.NewDecoder(resp.Body).Decode(&resData)
	if len(resData.Choices) > 0 {
		return resData.Choices[0].Message.Content, nil
	}

	return "No recommendation generated.", nil
}

func PredictStatus(c *gin.Context)       { proxyML(c, "/api/predict/status") }
func PredictAnomalyBatch(c *gin.Context) { proxyML(c, "/api/predict/anomaly-batch") }
func PredictForecast(c *gin.Context)     { proxyML(c, "/api/predict/forecast") }

func proxyML(c *gin.Context, path string) {
	mlServiceUrl := os.Getenv("ML_SERVICE_URL")
	if mlServiceUrl == "" {
		mlServiceUrl = "http://localhost:8000"
	}

	bodyBytes, _ := ioutil.ReadAll(c.Request.Body)
	resp, err := http.Post(mlServiceUrl+path, "application/json", bytes.NewBuffer(bodyBytes))
	if err != nil {
		c.JSON(500, gin.H{"error": "Failed to reach ML engine."})
		return
	}
	defer resp.Body.Close()

	var data interface{}
	json.NewDecoder(resp.Body).Decode(&data)
	c.JSON(resp.StatusCode, data)
}
