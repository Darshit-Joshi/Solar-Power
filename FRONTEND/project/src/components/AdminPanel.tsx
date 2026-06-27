import React, { useState, useEffect } from "react";
import "./AdminPanel.css";

interface AdminPanelProps {
  onCityZoneUpdate: (city: string, zone: string) => void;
}

interface ZoneInfo {
  description: string;
  manager: string;
  lastMaintenance: string;
}

interface PlantData {
  [city: string]: {
    zones: {
      [zone: string]: ZoneInfo;
    };
  };
}

const AdminPanel: React.FC<AdminPanelProps> = ({ onCityZoneUpdate }) => {
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedZone, setSelectedZone] = useState("");
  const [zoneInfo, setZoneInfo] = useState<ZoneInfo | null>(null);
  const [plantData, setPlantData] = useState<PlantData>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPlantConfigurations = async () => {
      try {
        // Simulated API call
        setTimeout(() => {
          setPlantData({
            "New York": {
              zones: {
                "Zone 1": {
                  description: "Rooftop solar, 200 kW.",
                  manager: "John Doe",
                  lastMaintenance: "2025-06-15",
                },
                "Zone 2": {
                  description: "Ground mounted, 150 kW.",
                  manager: "Jane Smith",
                  lastMaintenance: "2025-05-20",
                },
              },
            },
            "San Francisco": {
              zones: {
                "Zone A": {
                  description: "Bay area farm, 300 kW.",
                  manager: "Alice Johnson",
                  lastMaintenance: "2025-07-01",
                },
              },
            },
          });
          setIsLoading(false);
        }, 800);
      } catch (error) {
        console.error("Failed to fetch plant data", error);
        setIsLoading(false);
      }
    };
    fetchPlantConfigurations();
  }, []);

  useEffect(() => {
    if (
      selectedCity &&
      selectedZone &&
      plantData[selectedCity]?.zones[selectedZone]
    ) {
      setZoneInfo(plantData[selectedCity].zones[selectedZone]);
    } else {
      setZoneInfo(null);
    }
  }, [selectedCity, selectedZone, plantData]);

  const handleCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCity(e.target.value);
    setSelectedZone("");
    setZoneInfo(null);
  };

  const handleSaveForm = async (formType: string, event: React.MouseEvent) => {
    event.preventDefault();
    try {
      if (formType === "plant" && selectedCity && selectedZone) {
        onCityZoneUpdate(selectedCity, selectedZone);
      }
      alert(`✅ ${formType} settings saved successfully!`);
    } catch (error) {
      alert(`❌ Failed to save ${formType} settings.`);
    }
  };

  if (isLoading)
    return (
      <div className="admin-panel fade-in">
        <h2>Loading System Configurations...</h2>
      </div>
    );

  return (
    <div className="admin-panel fade-in">
      <h2>Admin Panel</h2>
      <p>Configure your plant system parameters and settings.</p>

      <div className="admin-grid">
        {/* Solar Plant Card */}
        <div className="admin-card" id="solar-plant">
          <h3>🌞 Solar Plant</h3>
          <form>
            <div className="form-group">
              <label>City Location</label>
              <select value={selectedCity} onChange={handleCityChange}>
                <option value="">Select City</option>
                {Object.keys(plantData).map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Zone</label>
              <select
                value={selectedZone}
                onChange={(e) => setSelectedZone(e.target.value)}
                disabled={!selectedCity}
              >
                <option value="">Select Zone</option>
                {selectedCity &&
                  Object.keys(plantData[selectedCity].zones).map((zone) => (
                    <option key={zone} value={zone}>
                      {zone}
                    </option>
                  ))}
              </select>
            </div>
            <div className="zone-info">
              {zoneInfo
                ? `Mgr: ${zoneInfo.manager} | Maint: ${zoneInfo.lastMaintenance}`
                : "Select city & zone."}
            </div>
            <button
              className="btn btn-success"
              onClick={(e) => handleSaveForm("plant", e)}
            >
              Save Plant Settings
            </button>
          </form>
        </div>

        {/* Machine & User Management */}
        <div className="admin-card">
          <h3>🖥️ Machine & User Management</h3>
          <form>
            <div className="form-group">
              <label>Machine Count</label>
              <input type="number" defaultValue="20" />
            </div>
            <div className="form-group">
              <label>User Creation</label>
              <select>
                <option>Enabled</option>
                <option>Disabled</option>
              </select>
            </div>
            <div className="form-group">
              <label>Access Level</label>
              <select>
                <option>Admin</option>
                <option>Operator</option>
              </select>
            </div>
            <button
              className="btn btn-success"
              onClick={(e) => handleSaveForm("Machine & User", e)}
            >
              Save Settings
            </button>
          </form>
        </div>

        {/* Company & Fleet */}
        <div className="admin-card">
          <h3>🏢 Company & Fleet</h3>
          <form>
            <div className="form-group">
              <label>Company Name</label>
              <input type="text" defaultValue="XYZ Corp" />
            </div>
            <div className="form-group">
              <label>Fleet Control</label>
              <select>
                <option>Automatic</option>
                <option>Manual</option>
              </select>
            </div>
            <div className="form-group">
              <label>Customer Details</label>
              <input type="text" defaultValue="Customer A" />
            </div>
            <button
              className="btn btn-success"
              onClick={(e) => handleSaveForm("Company & Fleet", e)}
            >
              Save Settings
            </button>
          </form>
        </div>

        {/* Schedules & Timing */}
        <div className="admin-card">
          <h3>⏰ Schedules & Timing</h3>
          <form>
            <div className="form-group">
              <label>Service Schedule</label>
              <input type="text" defaultValue="Monthly" />
            </div>
            <div className="form-group">
              <label>Cycle Time (min)</label>
              <input type="number" defaultValue="30" />
            </div>
            <div className="form-group">
              <label>Mode</label>
              <select>
                <option>Auto</option>
                <option>Manual</option>
              </select>
            </div>
            <button
              className="btn btn-success"
              onClick={(e) => handleSaveForm("Schedules & Timing", e)}
            >
              Save Settings
            </button>
          </form>
        </div>

        {/* Panel & Device Configuration */}
        <div className="admin-card">
          <h3>⚙️ Device Configuration</h3>
          <form>
            <div className="form-group">
              <label>Panel Configuration</label>
              <input type="text" defaultValue="Default" />
            </div>
            <div className="form-group">
              <label>Cycles to Run</label>
              <input type="number" defaultValue="3" />
            </div>
            <div className="form-group">
              <label>Device ID</label>
              <input type="text" defaultValue="DEV-001" />
            </div>
            <button
              className="btn btn-success"
              onClick={(e) => handleSaveForm("Device Config", e)}
            >
              Save Settings
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
