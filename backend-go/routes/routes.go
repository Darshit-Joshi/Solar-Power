package routes

import (
	"backend-go/controllers"

	"github.com/gin-gonic/gin"
)

func RegisterRoutes(r *gin.Engine) {
	api := r.Group("/api")

	fakeDataRoutes := api.Group("/fakedataRoutes")
	{
		fakeDataRoutes.GET("/fake-data", controllers.GetFakeData)
	}

	historyRoutes := api.Group("/historyRoutes")
	{
		historyRoutes.GET("/machines/history", controllers.GetHistory)
		historyRoutes.GET("/historical-data", controllers.GetHistoricalData)
	}

	aiRoutes := api.Group("/ai")
	{
		aiRoutes.POST("/predict/status", controllers.PredictStatus)
		aiRoutes.POST("/predict/anomaly-batch", controllers.PredictAnomalyBatch)
		aiRoutes.POST("/predict/forecast", controllers.PredictForecast)
		aiRoutes.POST("/diagnostic", controllers.GenerateDiagnostic)
		aiRoutes.POST("/troubleshoot", controllers.TroubleshootAlert)
	}

	machinesRoutes := api.Group("/machines")
	{
		machinesRoutes.GET("/latest", controllers.GetLatestMachine)
	}
}
