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

  // Search suggestions and keyboard navigation state
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const searchRef = useRef<HTMLDivElement>(null);

  // EXPANDED: Map covering all dashboard tabs, ML features, and Groq LLM widgets
  const parameterMap: Record<string, { id: string; tab: string }> = {
    // Live Status Parameters
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

    // Reports Parameters
    "Error Code": { tab: "reports", id: "Error Code" },
    "Total Runtime Reports": { tab: "reports", id: "Total Runtime" },
    "DBG Accel Output Reports": { tab: "reports", id: "DBG Accel Output" },
    "DBG Gyro Output Reports": { tab: "reports", id: "DBG Gyro Output" },
    "DBG Motor Status 0 Reports": { tab: "reports", id: "DBG Motor Status 0" },
    "DBG Motor Status 1 Reports": { tab: "reports", id: "DBG Motor Status 1" },
    "General Status Reports": { tab: "reports", id: "General Status" },
    "Time Stamp Reports": { tab: "reports", id: "Time Stamp" },

    // NEW: AI & ML Engine Sections
    "AI Power Forecast": { tab: "reports", id: "ai-forecast-section" },
    "ML Predictive Yield": { tab: "reports", id: "ai-forecast-section" },
    "Groq Executive Summary": { tab: "reports", id: "groq-summary-section" },
    "AI Diagnostic Report": { tab: "reports", id: "groq-summary-section" },
    "AI Intelligence Analytics": { tab: "ai-intelligence", id: "ai-main" },
    "LLM Diagnostic Engine": { tab: "ai-intelligence", id: "ai-main" },

    // Alerts & Admin Sections
    "Active Alerts": { tab: "alerts", id: "alerts-list" },
    "AI Troubleshoot Guide": { tab: "alerts", id: "ai-troubleshoot" },
    "System Configuration": { tab: "admin", id: "admin-config" },
    "FTP Backup Settings": { tab: "admin", id: "ftp-settings" },
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setSelectedIndex(-1); // Reset keyboard selection on type

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

  // NEW: Keyboard navigation (Up, Down, Enter, Escape)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < suggestions.length - 1 ? prev + 1 : prev,
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0 && suggestions[selectedIndex]) {
        executeSearch(suggestions[selectedIndex]);
      } else {
        executeSearch(query);
      }
    } else if (e.key === "Escape") {
      setSuggestions([]);
    }
  };

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
    // FIX: Guard against empty searches jumping to the first element
    if (!searchQuery || !searchQuery.trim()) {
      setSuggestions([]);
      return;
    }

    setQuery(searchQuery);
    setSuggestions([]);
    setSelectedIndex(-1);

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
          element.style.outline = "3px solid #8b5cf6"; // Purple AI theme highlight
          element.style.outlineOffset = "4px";
          element.style.transition = "outline 0.3s ease";

          setTimeout(() => {
            element.style.outline = "transparent";
          }, 2000);
        }
      }, 400);
    } else {
      alert(
        `No parameter matching "${searchQuery}" found! Try selecting from the suggestions.`,
      );
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

        {/* Search Bar with Autocomplete & Keyboard Navigation */}
        <div
          className="nav-search-container"
          ref={searchRef}
          style={{ position: "relative", margin: "0 20px 20px" }}
        >
          <div className="nav-search" style={{ margin: 0 }}>
            <input
              type="text"
              placeholder="Search parameters, AI metrics..."
              value={query}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
            />
            <button onClick={() => executeSearch(query)} aria-label="Search">
              <Search size={16} />
            </button>
          </div>

          {/* Suggestions Dropdown */}
          {suggestions.length > 0 && (
            <div
              className="search-suggestions"
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                backgroundColor: "#1e293b", // Dark theme matching dashboard
                border: "1px solid #334155",
                borderRadius: "6px",
                marginTop: "4px",
                boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.5)",
                zIndex: 50,
                maxHeight: "220px",
                overflowY: "auto",
              }}
            >
              {suggestions.map((suggestion, index) => {
                const isSelected = index === selectedIndex;
                return (
                  <div
                    key={index}
                    onClick={() => executeSearch(suggestion)}
                    style={{
                      padding: "10px 15px",
                      cursor: "pointer",
                      fontSize: "0.9em",
                      color: isSelected ? "#fff" : "#cbd5e1",
                      backgroundColor: isSelected ? "#334155" : "transparent",
                      borderBottom:
                        index === suggestions.length - 1
                          ? "none"
                          : "1px solid #334155",
                      transition: "background-color 0.15s ease",
                    }}
                    onMouseOver={() => setSelectedIndex(index)}
                  >
                    {suggestion}{" "}
                    <span
                      style={{
                        float: "right",
                        fontSize: "0.8em",
                        color: "#a855f7", // Purple badge for tab name
                        fontWeight: "bold",
                      }}
                    >
                      {parameterMap[suggestion].tab.toUpperCase()}
                    </span>
                  </div>
                );
              })}
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

      {/* Mobile Dropdown */}
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
