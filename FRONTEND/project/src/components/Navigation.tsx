// src/components/Navigation.tsx
import React, { useState, useEffect, useRef } from "react";
import {
  Settings,
  Activity,
  BarChart3,
  AlertTriangle,
  ChevronDown,
  Search,
  Brain,
} from "lucide-react";
import "./Navigation.css";

interface NavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const Navigation: React.FC<NavigationProps> = ({ activeTab, onTabChange }) => {
  const [isDropdownOpen, setDropdownOpen] = useState(false);
  const [query, setQuery] = useState("");

  // NEW: State for search suggestions and tracking clicks outside
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);

  const parameterMap: Record<string, { id: string; tab: string }> = {
    // live status parameters
    "Device ID": { id: "Device ID", tab: "live-status" },
    "Device State": { id: "Device State", tab: "live-status" },
    "FW Version": { id: "FW Version", tab: "live-status" },
    Temperature: { id: "Temperature", tab: "live-status" },
    Humidity: { id: "Humidity", tab: "live-status" },
    "Voltage Battery": { id: "Voltage Battery", tab: "live-status" },
    "Voltage Solar Panel": { id: "Voltage Solar Panel", tab: "live-status" },
    "Running Current": { id: "Running Current", tab: "live-status" },
    "Avg Current": { id: "Avg Current", tab: "live-status" },
    "Motor Speed": { id: "Motor Speed", tab: "live-status" },
    "Panel Location": { id: "Panel Location", tab: "live-status" },
    "Battery %": { id: "Battery %", tab: "live-status" },
    "Connectivity Status": { id: "Connectivity Status", tab: "live-status" },
    "Total Runtime": { id: "Total Runtime", tab: "live-status" },
    "DBG Accel Output": { id: "DBG Accel Output", tab: "live-status" },
    "DBG Gyro Output": { id: "DBG Gyro Output", tab: "live-status" },
    "DBG Motor Status 0": { id: "DBG Motor Status 0", tab: "live-status" },
    "DBG Motor Status 1": { id: "DBG Motor Status 1", tab: "live-status" },
    "General Status": { id: "General Status", tab: "live-status" },
    "Time Stamp": { id: "Time Stamp", tab: "live-status" },

    // reports parameters
    "Error Code": { tab: "reports", id: "Error Code" },
    "Total Runtime Reports": { tab: "reports", id: "Total Runtime" },
    "DBG Accel Output Reports": { tab: "reports", id: "DBG Accel Output" },
    "DBG Gyro Output Reports": { tab: "reports", id: "DBG Gyro Output" },
    "DBG Motor Status 0 Reports": { tab: "reports", id: "DBG Motor Status 0" },
    "DBG Motor Status 1 Reports": { tab: "reports", id: "DBG Motor Status 1" },
    "General Status Reports": { tab: "reports", id: "General Status" },
    "Time Stamp Reports": { tab: "reports", id: "Time Stamp" },
  };

  // NEW: Handle input changes and generate suggestions
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    if (value.trim().length > 0) {
      const searchKey = value.toLowerCase();
      const matches = Object.keys(parameterMap).filter((key) =>
        key.toLowerCase().includes(searchKey),
      );
      setSuggestions(matches);
    } else {
      setSuggestions([]);
    }
  };

  // Close suggestions if user clicks outside the search box
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setSuggestions([]);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const executeSearch = (searchQuery: string) => {
    setQuery(searchQuery); // Set the input to the exact match
    setSuggestions([]); // Close dropdown

    const searchKey = searchQuery.toLowerCase().trim();
    const exactMatch = Object.entries(parameterMap).find(
      ([key]) => key.toLowerCase() === searchKey,
    );

    const found =
      exactMatch ||
      Object.entries(parameterMap).find(([key]) =>
        key.toLowerCase().includes(searchKey),
      );

    if (found) {
      const { id, tab } = found[1];
      onTabChange(tab);

      setTimeout(() => {
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
          element.style.outline = "3px solid #8b5cf6"; // Updated to a modern purple to match your AI theme
          element.style.outlineOffset = "2px";
          element.style.transition = "outline 0.3s ease";

          setTimeout(() => {
            element.style.outline = "transparent";
          }, 2000); // Highlight lasts slightly longer
        }
      }, 400);
    } else {
      alert("Parameter not found! Try using the suggestions.");
    }
  };

  const tabs = [
    { id: "admin", label: "Admin", icon: Settings },
    { id: "live-status", label: "Live Status", icon: Activity },
    { id: "reports", label: "Reports", icon: BarChart3 },
    { id: "alerts", label: "Alerts", icon: AlertTriangle },
    { id: "ai-intelligence", label: "AI Intelligence", icon: Brain },
  ];

  const activeLabel = tabs.find((t) => t.id === activeTab)?.label || "Admin";

  return (
    <>
      <nav className="navigation desktop-nav">
        <div className="nav-header">
          <h2>Solar Plant Monitor</h2>
          <p>Control Dashboard</p>
        </div>

        {/* UPGRADED: Search Bar with Suggestions Dropdown */}
        <div
          className="nav-search-container"
          ref={searchRef}
          style={{ position: "relative", margin: "0 20px 20px" }}
        >
          <div className="nav-search" style={{ margin: 0 }}>
            <input
              type="text"
              placeholder="Search parameters..."
              value={query}
              onChange={handleInputChange}
              onKeyDown={(e) => e.key === "Enter" && executeSearch(query)}
            />
            <button onClick={() => executeSearch(query)}>
              <Search size={16} />
            </button>
          </div>

          {/* Render Suggestions Dropdown */}
          {suggestions.length > 0 && (
            <div
              className="search-suggestions"
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                backgroundColor: "white",
                border: "1px solid #e2e8f0",
                borderRadius: "6px",
                marginTop: "4px",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                zIndex: 50,
                maxHeight: "200px",
                overflowY: "auto",
              }}
            >
              {suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  onClick={() => executeSearch(suggestion)}
                  style={{
                    padding: "10px 15px",
                    cursor: "pointer",
                    fontSize: "0.9em",
                    color: "#334155",
                    borderBottom:
                      index === suggestions.length - 1
                        ? "none"
                        : "1px solid #f1f5f9",
                  }}
                  onMouseOver={(e) =>
                    (e.currentTarget.style.backgroundColor = "#f8fafc")
                  }
                  onMouseOut={(e) =>
                    (e.currentTarget.style.backgroundColor = "transparent")
                  }
                >
                  {suggestion}{" "}
                  <span
                    style={{
                      float: "right",
                      fontSize: "0.8em",
                      color: "#94a3b8",
                    }}
                  >
                    {parameterMap[suggestion].tab}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="nav-tabs">
          {tabs.map((tab) => {
            const IconComponent = tab.icon;
            return (
              <div
                key={tab.id}
                className={`nav-tab ${activeTab === tab.id ? "active" : ""}`}
                onClick={() => onTabChange(tab.id)}
              >
                <IconComponent size={20} />
                <span>{tab.label}</span>
              </div>
            );
          })}
        </div>
      </nav>

      {/* Mobile Dropdown (Unchanged) */}
      <div className="mobile-dropdown">
        <button
          className="dropdown-btn"
          onClick={() => setDropdownOpen(!isDropdownOpen)}
        >
          {activeLabel}
          <ChevronDown size={16} />
        </button>
        {isDropdownOpen && (
          <div className="dropdown-menu">
            {tabs.map((tab) => (
              <div
                key={tab.id}
                className={`dropdown-item ${activeTab === tab.id ? "active" : ""}`}
                onClick={() => {
                  onTabChange(tab.id);
                  setDropdownOpen(false);
                }}
              >
                {tab.label}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default Navigation;
