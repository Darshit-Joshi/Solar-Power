package websockets

import (
	"fmt"
	"net/http"
	"sync"

	"backend-go/models"
	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true 
	},
}

type ClientManager struct {
	clients map[*websocket.Conn]bool
	sync.RWMutex
}

var Manager = ClientManager{
	clients: make(map[*websocket.Conn]bool),
}

func ServeWS(c *gin.Context) {
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		fmt.Println("Websocket upgrade error:", err)
		return
	}

	Manager.Lock()
	Manager.clients[conn] = true
	Manager.Unlock()

	fmt.Println("🔌 Dashboard Client Connected")

	go func() {
		defer func() {
			Manager.Lock()
			delete(Manager.clients, conn)
			Manager.Unlock()
			conn.Close()
			fmt.Println("🔌 Client Disconnected")
		}()
		for {
			if _, _, err := conn.ReadMessage(); err != nil {
				break
			}
		}
	}()
}

func BroadcastTelemetry(liveData models.Reading) {
	Manager.RLock()
	defer Manager.RUnlock()

	for conn := range Manager.clients {
		msg := map[string]interface{}{
			"event": "live_telemetry_update",
			"data":  liveData,
		}
		err := conn.WriteJSON(msg)
		if err != nil {
			conn.Close()
		}
	}
}
