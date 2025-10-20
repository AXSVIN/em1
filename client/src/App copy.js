// Main Application Component (App.jsx)
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Clock, Calendar, User, Globe, Users, Trash2, X, Plus, ListChecks, MessageSquare, AlertTriangle, Info, Edit, Loader2 } from 'lucide-react';

// --- Constants & Utilities ---
// Timezone list (subset for example)
const TIMEZONES = [
  'America/New_York',
  'Europe/London',
  'Europe/Paris',
  'Asia/Tokyo',
  'Asia/Kolkata',
  'UTC',
];

const API_BASE_URL = 'http://localhost:3000/api';

/**
 * Helper to convert UTC ISO string to a specific timezone string for display.
 * @param {string} utcIsoString
 * @param {string} timezone - The target timezone ID (e.g., 'America/New_York').
 * @returns {string} Formatted local date and time.
 */
const formatEventTime = (utcIsoString, timezone) => {
  if (!utcIsoString) return 'N/A';
  // Fallback function for simple formatting without heavy library dependency
  const date = new Date(utcIsoString);
  if (isNaN(date.getTime())) return 'Invalid Date';

  const options = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: timezone, // Use the browser's native timezone support
  };
  
  try {
      // Use the specified timezone for display
      const formatter = new Intl.DateTimeFormat('en-US', options);
      return formatter.format(date);
  } catch (e) {
      // Fallback if timezone is invalid
      return date.toLocaleString('en-US', { timeZone: 'UTC' }) + ' (UTC)';
  }
};

// --- Custom Components ---

const Button = ({ children, className = '', ...props }) => (
  <button
    className={`px-4 py-2 font-semibold rounded-lg transition duration-150 ease-in-out shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 ${className}`}
    {...props}
  >
    {children}
  </button>
);

const ErrorAlert = ({ message, onClose }) => (
  <div className="fixed inset-0 bg-red-800 bg-opacity-75 flex items-center justify-center z-50 p-4">
    <div className="bg-white p-6 rounded-xl shadow-2xl max-w-lg w-full transform transition-all">
      <h3 className="text-xl font-bold text-red-600 mb-4">Connection Error</h3>
      <p className="text-gray-700 mb-6">{message}</p>
      <div className="flex justify-end">
        <Button onClick={onClose} className="bg-red-500 text-white hover:bg-red-600">
          Acknowledge
        </Button>
      </div>
    </div>
  </div>
);

// Tooltip Wrapper Component
const TooltipWrapper = ({ children, tooltipContent }) => {
    const tooltipTextClass = "bg-white text-indigo-700 border border-indigo-200 shadow-xl";
    const arrowClass = "bg-white border-b border-r border-indigo-200 shadow-xl";

    return (
        <div className="relative group w-full">
            {children}
            <div 
                className={`absolute z-20 w-max mt-1 flex flex-col items-center opacity-0 
                           group-hover:opacity-100 transition-opacity duration-300 pointer-events-none 
                           transform -translate-x-1/2 left-1/2`}
            >
                <span className={`relative p-2 text-xs leading-none rounded-lg font-medium whitespace-nowrap ${tooltipTextClass}`}>
                    {tooltipContent}
                </span>
                
                <div className={`w-3 h-3 -mt-1 rotate-45 ${arrowClass}`}></div>
            </div>
        </div>
    );
};


// --- Modal Components ---

const Modal = ({ isOpen, onClose, children, title, className = '' }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-gray-900 bg-opacity-60 p-4">
      <div className={`bg-white rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto transform transition-all ${className}`}>
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-2xl font-bold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

// --- Log Viewer Modal Component ---

const LogViewerModal = ({ event, onClose, profiles }) => {
    
    const profileMap = useMemo(() => { 
        return profiles.reduce((acc, p) => {
            acc[p._id] = p.name;
            return acc;
        }, {});
    }, [profiles]);
    
    if (!event) return null;

    const creationTime = new Date(event.createdAt).getTime();
    const updateTime = new Date(event.updatedAt).getTime();

    // --- Mock Log Data Generation ---
    const generateMockLogs = (event) => {
        const logs = [];
        const baseTime = creationTime;

        // 1. Creation Log
        logs.push({ 
            time: new Date(baseTime), 
            type: 'SUCCESS', 
            message: `Event successfully created. Initial UTC start: ${event.startUtc}. Assigned Profiles: ${event.profiles.map(id => profileMap[id] || 'Unknown').join(', ')}.`,
            icon: ListChecks,
            color: 'text-green-600',
        });
        
        // 2. Initial Broadcast/Notification Log
        logs.push({
            time: new Date(baseTime + 60000), // + 1 minute
            type: 'INFO',
            message: `Notification service: Broadcast sent to ${event.profiles.length} profile(s).`,
            icon: MessageSquare,
            color: 'text-blue-500',
        });
        
        // 3. Simulated Update Log (if updated)
        if (updateTime > creationTime) {
             logs.push({
                time: new Date(updateTime),
                type: 'UPDATE',
                message: `Event details updated. New UTC end time set to: ${event.endUtc}.`,
                icon: Info,
                color: 'text-yellow-600',
            });
             // Add a mock system check log after update
             logs.push({
                time: new Date(updateTime + 30000), // + 30 seconds
                type: 'WARNING',
                message: `System Check: Time conversion for 'Europe/London' profile yielded a 1-second discrepancy during validation.`,
                icon: AlertTriangle,
                color: 'text-orange-500',
            });
        }
        
        // 4. Future/Pending Log
        const futureTime = new Date(new Date().getTime() + 7200000); // 2 hours from now
        logs.push({
            time: futureTime,
            type: 'PENDING',
            message: `Reminder scheduled for 1 hour before event start.`,
            icon: Clock,
            color: 'text-gray-500',
        });

        // Sort logs by time descending (most recent first)
        return logs.sort((a, b) => b.time.getTime() - a.time.getTime());
    };
    
    const logs = generateMockLogs(event);
    const viewingTimezone = 'Europe/London'; // Use a fixed timezone for log display for consistency

    return (
        <Modal 
            isOpen={!!event} 
            onClose={onClose} 
            title={`Log History for Event ID: ${event._id.substring(0, 8)}...`}
            className="w-full max-w-2xl"
        >
            <div className="p-6">
                <p className="text-sm text-gray-500 mb-4 border-b pb-2">
                    Showing {logs.length} simulated log entries. All timestamps are converted to **{viewingTimezone}**.
                </p>
                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                    {logs.map((log, index) => {
                        const Icon = log.icon;
                        const formattedTime = formatEventTime(log.time.toISOString(), viewingTimezone);
                        
                        return (
                            <div key={index} className="flex space-x-3 p-3 bg-gray-50 rounded-lg border-l-4 border-gray-200 shadow-sm hover:shadow-md transition">
                                <div className={`flex-shrink-0 ${log.color}`}>
                                    <Icon size={18} />
                                </div>
                                <div className="flex-grow">
                                    <div className="flex justify-between items-start">
                                        <span className={`text-xs font-bold uppercase ${log.color}`}>{log.type}</span>
                                        <span className="text-xs text-gray-500 font-mono">{formattedTime}</span>
                                    </div>
                                    <p className="text-sm text-gray-700 mt-1">{log.message}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
            
            <div className="p-4 border-t border-gray-200 flex justify-end bg-gray-50 rounded-b-xl">
                <Button onClick={onClose} className="bg-gray-500 text-white hover:bg-gray-600">
                    Close Log
                </Button>
            </div>
        </Modal>
    );
};


// --- Profile Manager Modal Component (Updated with Edit and Delete) ---

const ProfileManagerModal = ({ isOpen, onClose, profiles, selectedProfileId, setSelectedProfileId, refreshProfiles, onUpdateProfile, onDeleteProfile }) => {
  const [newProfileName, setNewProfileName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // State for editing the selected profile
  const [editName, setEditName] = useState('');
  const [editTimezone, setEditTimezone] = useState('UTC');
  const [isEditLoading, setIsEditLoading] = useState(false);
  const [editError, setEditError] = useState('');
  
  const selectedProfile = useMemo(() => 
    profiles.find(p => p._id === selectedProfileId), 
    [profiles, selectedProfileId]
  );
  
  // Custom CSS for placeholder on hover effect (must be defined once globally)
  const PLACEHOLDER_HOVER_STYLE = `
      .input-hover-effect:hover::placeholder {
          color: white !important;
          opacity: 1; 
      }
      .input-hover-effect:hover {
          color: white; 
      }
      .input-hover-effect {
          color: #1f2937; 
      }
  `;
  const commonInputClass = "w-full p-2 border border-gray-300 rounded-lg transition-colors duration-150 focus:ring-indigo-500 focus:border-indigo-500 bg-white hover:bg-indigo-600 hover:text-white input-hover-effect";


  // Populate edit fields when a profile is selected
  useEffect(() => {
    if (selectedProfile) {
      setEditName(selectedProfile.name);
      setEditTimezone(selectedProfile.userTimezone);
    } else {
      setEditName('');
      setEditTimezone('UTC');
    }
    setEditError('');
  }, [selectedProfile]);

  const handleCreateProfile = async (e) => {
    e.preventDefault();
    if (!newProfileName.trim()) return;

    setIsLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/profiles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newProfileName.trim() }),
      });

      if (!response.ok) throw new Error('Failed to create profile.');
      
      const newProfile = await response.json();
      await refreshProfiles(newProfile._id); // Refresh and auto-select
      setNewProfileName('');
    } catch (err) {
      console.error("Profile creation error:", err);
      setError('Could not create profile. Try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!selectedProfile || !editName.trim()) return;
    
    setIsEditLoading(true);
    setEditError('');
    
    try {
        await onUpdateProfile(selectedProfile._id, editName.trim(), editTimezone);
        // Success handled by parent's refreshProfiles
    } catch (err) {
        setEditError(err.message || 'Failed to update profile.');
    } finally {
        setIsEditLoading(false);
    }
  };
  
  const handleDeleteProfileClick = () => {
    if (!selectedProfile) return;

    if (window.confirm(`Are you sure you want to delete profile "${selectedProfile.name}"? This action cannot be undone and will remove all associated events.`)) {
        setIsEditLoading(true);
        setEditError('');

        onDeleteProfile(selectedProfile._id)
            .then(() => {
                onClose(); // Close the modal on successful deletion
            })
            .catch(err => {
                setEditError(err.message || 'Failed to delete profile.');
            })
            .finally(() => {
                setIsEditLoading(false);
            });
    }
  };


  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Manage Current Viewer Profile" className="w-full max-w-md">
      {/* Inject custom CSS for placeholder text color change on hover */}
      <style>{PLACEHOLDER_HOVER_STYLE}</style> 
      <div className="p-6 space-y-6">
        
        {/* 1. Profile Selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-600 block">Select Active Profile</label>
          <select
            value={selectedProfileId || ''}
            onChange={(e) => setSelectedProfileId(e.target.value)}
            className={commonInputClass}
          >
            <option value="" disabled>Select a profile</option>
            {profiles.map((profile) => (
              <option key={profile._id} value={profile._id}>
                {profile.name} ({profile.userTimezone})
              </option>
            ))}
          </select>
          {selectedProfile && (
              <p className="text-xs text-indigo-600 font-medium pt-1">Profile ID: {selectedProfile._id}</p>
          )}
        </div>
        
        {/* 2. Edit Selected Profile Section */}
        {selectedProfile && (
            <div className="border-t border-gray-200 pt-6 space-y-4">
                <h4 className="text-lg font-semibold text-gray-900 flex items-center">
                    <Edit size={18} className="mr-2 text-indigo-500"/>
                    Edit Profile: {selectedProfile.name}
                </h4>
                <form onSubmit={handleUpdateProfile} className="space-y-3">
                    {/* Name Input */}
                    <div>
                        <label htmlFor="editName" className="text-sm font-medium text-gray-600 block mb-1">Name</label>
                        <input
                          id="editName"
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          placeholder="Profile Name"
                          required
                          className={commonInputClass}
                          disabled={isEditLoading}
                        />
                    </div>
                    
                    {/* Timezone Input */}
                    <div>
                        <label htmlFor="editTimezone" className="text-sm font-medium text-gray-600 block mb-1">Timezone</label>
                        <select
                            id="editTimezone"
                            value={editTimezone}
                            onChange={(e) => setEditTimezone(e.target.value)}
                            required
                            className={commonInputClass}
                            disabled={isEditLoading}
                        >
                            {TIMEZONES.map(tz => (
                              <option key={tz} value={tz}>{tz}</option>
                            ))}
                        </select>
                    </div>

                    {editError && <p className="text-red-500 text-sm">{editError}</p>}
                    
                    <div className="flex justify-between space-x-2 pt-2">
                        {/* DELETE BUTTON */}
                        <Button
                          type="button"
                          onClick={handleDeleteProfileClick}
                          className="flex-grow bg-red-600 text-white hover:bg-red-700 disabled:bg-gray-400 flex items-center justify-center"
                          disabled={isEditLoading}
                        >
                          <Trash2 size={16} className="mr-2" /> 
                          Delete Profile
                        </Button>
                        
                        {/* SAVE BUTTON */}
                        <Button
                          type="submit"
                          className="flex-grow bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-gray-400 flex items-center justify-center"
                          disabled={isEditLoading || !editName.trim()}
                        >
                          {isEditLoading ? (
                            <><Loader2 size={16} className="animate-spin mr-2" /> Saving...</>
                          ) : 'Save Changes'}
                        </Button>
                    </div>
                </form>
            </div>
        )}

        {/* 3. Add New Profile Section */}
        <div className="border-t border-gray-200 pt-6 space-y-4">
          <h4 className="text-lg font-semibold text-gray-900 flex items-center">
              <Plus size={18} className="mr-2 text-indigo-500"/>
              Add New Profile
          </h4>
          <form onSubmit={handleCreateProfile} className="flex space-x-2">
            <input
              type="text"
              value={newProfileName}
              onChange={(e) => setNewProfileName(e.target.value)}
              placeholder="New Profile Name"
              required
              className="flex-grow p-2 border border-gray-300 rounded-lg transition-colors duration-150 focus:ring-indigo-500 focus:border-indigo-500 bg-white hover:bg-indigo-600 hover:text-white input-hover-effect"
              disabled={isLoading}
            />
            <Button
              type="submit"
              className="bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-gray-400"
              disabled={isLoading}
            >
              {isLoading ? 'Creating...' : 'Create'}
            </Button>
          </form>
          {error && <p className="text-red-500 text-sm">{error}</p>}
        </div>
      </div>
    </Modal>
  );
};

// --- Event Form (Reused for Create and Edit) ---

const EventFormContent = ({ eventData, setEventData, profiles, isEditing, onSubmit, isLoading, buttonLabel, error, refreshProfiles }) => {
  const [newProfileName, setNewProfileName] = useState('');
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [isProfileSelectorOpen, setIsProfileSelectorOpen] = useState(false); 

  const commonInputClass = "w-full p-2 border border-gray-300 rounded-lg transition-colors duration-150 focus:ring-indigo-500 focus:border-indigo-500 bg-white hover:bg-indigo-600 hover:text-white input-hover-effect";
  
  const profileMap = useMemo(() => {
    return profiles.reduce((acc, p) => {
        acc[p._id] = p.name;
        return acc;
    }, {});
  }, [profiles]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEventData(prev => ({ ...prev, [name]: value }));
  };

  const handleProfileSelection = (id) => {
    setEventData(prev => {
      const currentProfiles = prev.profiles || [];
      if (currentProfiles.includes(id)) {
        return { ...prev, profiles: currentProfiles.filter(pId => pId !== id) };
      } else {
        return { ...prev, profiles: [...currentProfiles, id] };
      }
    });
  };


  const handleCreateProfile = async () => {
    if (!newProfileName.trim()) return;

    try {
      const response = await fetch(`${API_BASE_URL}/profiles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newProfileName.trim() }),
      });

      if (!response.ok) throw new Error('Failed to create profile.');
      
      const newProfile = await response.json();
      
      setEventData(prev => ({ 
        ...prev, 
        profiles: [...(prev.profiles || []), newProfile._id]
      }));
      
      setNewProfileName('');
      setIsCreatingProfile(false);
      
      if(refreshProfiles) refreshProfiles();

    } catch (err) {
      console.error("Inline profile creation error:", err);
    }
  };


  const selectedProfileNames = (eventData.profiles || [])
      .map(id => profileMap[id] || `ID: ${id.substring(0, 4)}...`)
      .join(', ');

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Assign Profiles (CUSTOM Multi-select Input) */}
      <div className="space-y-2 relative">
        <label htmlFor="profiles-display" className="text-sm font-medium text-gray-600 flex items-center">
          <Users size={16} className="mr-2 text-indigo-500" />
          Select Profiles to Assign
        </label>
        
        <div 
          id="profiles-display"
          className={`${commonInputClass} cursor-pointer flex items-center justify-between min-h-[42px]`}
          onClick={() => setIsProfileSelectorOpen(prev => !prev)}
        >
          <span className={`truncate ${eventData.profiles.length > 0 ? 'text-gray-800' : 'text-gray-400'}`}>
            {eventData.profiles.length > 0 
                ? selectedProfileNames
                : "Click to select profile(s)"
            }
          </span>
          <Plus size={16} className={`ml-2 text-indigo-500 transition-transform ${isProfileSelectorOpen ? 'rotate-45' : 'rotate-0'}`} />
        </div>

        {/* Profile Selector Popover */}
        {isProfileSelectorOpen && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-xl max-h-60 overflow-y-auto">
            
            {/* Profile Checkboxes List */}
            {profiles.length > 0 ? (
                <div className="p-3 space-y-2">
                    {profiles.map((profile) => (
                        <div key={profile._id} className="flex items-center">
                            <input
                                id={`profile-${profile._id}`}
                                type="checkbox"
                                checked={eventData.profiles.includes(profile._id)}
                                onChange={() => handleProfileSelection(profile._id)}
                                className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                            />
                            <label htmlFor={`profile-${profile._id}`} className="ml-3 text-sm font-medium text-gray-700 cursor-pointer">
                                {profile.name}
                            </label>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="p-3 text-sm text-gray-500">No profiles available. Create one below.</p>
            )}
            
            {/* Combined Footer: Add Profile and Close Button */}
            <div className="p-3 border-t border-gray-200 space-y-2">
                
                {/* Add New Profile Section */}
                {!isCreatingProfile ? (
                  <Button
                    type="button"
                    onClick={() => setIsCreatingProfile(true)}
                    className="w-full bg-indigo-100 text-indigo-700 hover:bg-indigo-200 py-1.5 text-sm"
                  >
                    <Plus size={14} className="inline-block mr-1" /> Add New Profile
                  </Button>
                ) : (
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newProfileName}
                      onChange={(e) => setNewProfileName(e.target.value)}
                      placeholder="Enter new profile name"
                      required
                      className="flex-grow p-1.5 text-sm border border-gray-300 rounded-lg transition-colors duration-150 focus:ring-indigo-500 focus:border-indigo-500 bg-white hover:bg-indigo-600 hover:text-white input-hover-effect"
                    />
                    <Button
                      type="button"
                      onClick={handleCreateProfile}
                      className="bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-gray-400 px-3 py-1.5 text-sm"
                      disabled={isLoading || !newProfileName.trim()}
                    >
                      Create
                    </Button>
                    <Button
                      type="button"
                      onClick={() => {
                        setNewProfileName('');
                        setIsCreatingProfile(false);
                      }}
                      className="bg-gray-400 text-white hover:bg-gray-500 px-3 py-1.5 text-sm"
                    >
                      <X size={14} />
                    </Button>
                  </div>
                )}

                {/* Close Selection Button */}
                <Button 
                    type="button" 
                    onClick={() => setIsProfileSelectorOpen(false)}
                    className="w-full bg-gray-100 text-gray-700 hover:bg-gray-200 py-1.5 text-sm"
                >
                    Close Selection
                </Button>
            </div>
          </div>
        )}
      </div>
      
      {/* Timezone Selection */}
      <div className="space-y-2">
        <label htmlFor="eventTimezone" className="text-sm font-medium text-gray-600 flex items-center">
          <Globe size={16} className="mr-2 text-indigo-500" />
          Event Timezone
        </label>
        
        <TooltipWrapper tooltipContent={`Current Value: ${eventData.eventTimezone}`}>
          <select
            id="eventTimezone"
            name="eventTimezone"
            value={eventData.eventTimezone}
            onChange={handleInputChange}
            required
            className={commonInputClass}
          >
            {TIMEZONES.map(tz => (
              <option key={tz} value={tz}>{tz}</option>
            ))}
          </select>
        </TooltipWrapper>
        
      </div>

      {/* Start Date & Time */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-600 flex items-center">
          <Calendar size={16} className="mr-2 text-indigo-500" />
          Start Date & Time
        </label>
        <div className="flex space-x-2">
          <input
            type="date"
            name="startDate"
            value={eventData.startDate}
            onChange={handleInputChange}
            required
            className={`flex-[3] ${commonInputClass}`}
          />
          <input
            type="time"
            name="startTime"
            value={eventData.startTime}
            onChange={handleInputChange}
            required
            className={`flex-[1] ${commonInputClass}`}
          />
        </div>
      </div>

      {/* End Date & Time */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-600 flex items-center">
          <Clock size={16} className="mr-2 text-indigo-500" />
          End Date & Time
        </label>
        <div className="flex space-x-2">
          <input
            type="date"
            name="endDate"
            value={eventData.endDate}
            onChange={handleInputChange}
            required
            className={`flex-[3] ${commonInputClass}`}
          />
          <input
            type="time"
            name="endTime"
            value={eventData.endTime}
            onChange={handleInputChange}
            required
            className={`flex-[1] ${commonInputClass}`}
          />
        </div>
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      {/* Submit Button (Only used for Creation form) */}
      {!isEditing && (
        <Button
          type="submit"
          className="w-full bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-indigo-400"
          disabled={isLoading}
        >
          {isLoading ? 'Creating Event...' : buttonLabel || 'Create Event'}
        </Button>
      )}
    </form>
  );
};

// --- Edit Event Modal Component ---
const EditEventModal = ({ event, profiles, onClose, onUpdate, onDelete, profileTimezone, refreshProfiles }) => {
    const [eventData, setEventData] = useState(() => {
        const start = new Date(event.startUtc);
        const end = new Date(event.endUtc);
        
        return {
            startDate: start.toISOString().substring(0, 10),
            startTime: start.toISOString().substring(11, 16),
            endDate: end.toISOString().substring(0, 10),
            endTime: end.toISOString().substring(11, 16),
            eventTimezone: event.eventTimezone,
            profiles: event.profiles || [],
            _id: event._id
        };
    });

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        
        if (!eventData.profiles || eventData.profiles.length === 0) {
            setError('Please assign at least one profile.');
            setIsLoading(false);
            return;
        }

        const payload = {
            profiles: eventData.profiles,
            startDateTime: `${eventData.startDate}T${eventData.startTime}:00.000Z`,
            endDateTime: `${eventData.endDate}T${eventData.endTime}:00.000Z`,
            eventTimezone: eventData.eventTimezone
        };

        onUpdate(event._id, payload)
            .catch(err => setError(err.message || 'Failed to update event.'))
            .finally(() => setIsLoading(false));
    };
    
    const handleDeleteClick = () => {
        if (window.confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
            setIsLoading(true);
            onDelete(event._id)
                .catch(err => setError(err.message || 'Failed to delete event.'))
                .finally(() => setIsLoading(false));
        }
    }
    
    const smallButtonClass = "px-3 py-1 text-sm font-medium rounded-lg transition duration-150 ease-in-out shadow-sm hover:shadow-md";

    return (
        <Modal 
            isOpen={!!event} 
            onClose={onClose} 
            title={`Edit Event (ID: ${event._id.substring(0, 8)}...)`}
            className="w-full max-w-xl"
        >
            <div className="p-6">
                <p className="text-sm text-gray-500 mb-4">
                    Times shown are UTC, but are converted to your **{profileTimezone}** timezone in the event list.
                </p>
                <EventFormContent
                    eventData={eventData}
                    setEventData={setEventData}
                    profiles={profiles}
                    isEditing={true}
                    onSubmit={handleSubmit}
                    isLoading={isLoading}
                    buttonLabel="Update Event"
                    error={error}
                    refreshProfiles={refreshProfiles}
                />
            </div>
            
            <div className="p-4 border-t border-gray-200 flex justify-end space-x-3 bg-gray-50 rounded-b-xl">
                <Button 
                    type="button" 
                    onClick={onClose} 
                    className={`${smallButtonClass} bg-gray-500 text-white hover:bg-gray-600`}
                    disabled={isLoading}
                >
                    Cancel Edit
                </Button>
                <Button 
                    type="button" 
                    onClick={handleDeleteClick} 
                    className={`${smallButtonClass} bg-red-600 text-white hover:bg-red-700`}
                    disabled={isLoading}
                >
                    <Trash2 size={14} className="inline mr-1" />
                    Delete Event
                </Button>
                <Button 
                    type="submit" 
                    onClick={handleSubmit}
                    className={`${smallButtonClass} bg-indigo-600 text-white hover:bg-indigo-700`}
                    disabled={isLoading || error || eventData.profiles.length === 0}
                >
                    {isLoading ? 'Updating...' : 'Update Event'}
                </Button>
            </div>
        </Modal>
    );
};


// --- Scheduled Events List Component ---
const ScheduledEvents = ({ events, profiles, viewingTimezone, setViewingTimezone, onEditEvent, onViewLog, isLoading, error }) => {
    
    const profileMap = useMemo(() => {
        return profiles.reduce((acc, p) => {
            acc[p._id] = p.name;
            return acc;
        }, {});
    }, [profiles]);

    if (isLoading) return <p className="text-center text-gray-500 mt-8 flex items-center justify-center"><Loader2 className="animate-spin mr-2"/> Loading scheduled events...</p>;
    if (error) return <p className="text-center text-red-500 mt-8">Error loading events: {error}</p>;
    if (events.length === 0) return <p className="text-center text-gray-500 mt-8">No events scheduled for the current profile.</p>;
    
    const commonInputClass = "w-full p-2 border border-gray-300 rounded-lg transition-colors duration-150 focus:ring-indigo-500 focus:border-indigo-500 bg-white hover:bg-indigo-600 hover:text-white input-hover-effect";

    return (
        <div className="space-y-4">
            {/* TIMEZONE SELECTION INPUT */}
            <div className="mb-6 bg-white p-4 rounded-xl shadow-lg border border-indigo-100">
                <label htmlFor="viewingTimezone" className="text-sm font-medium text-gray-600 flex items-center mb-1">
                    <Globe size={16} className="mr-2 text-indigo-500" />
                    Viewing Timezone
                </label>
                <select
                    id="viewingTimezone"
                    value={viewingTimezone}
                    onChange={(e) => setViewingTimezone(e.target.value)}
                    className={commonInputClass}
                >
                    {TIMEZONES.map(tz => (
                        // KEY IS THE TIMEZONE STRING, NO DUPLICATES
                        <option key={tz} value={tz}>{tz}</option>
                    ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                    All event times below are converted and shown in the selected timezone.
                </p>
            </div>
            {/* END TIMEZONE SELECTION INPUT */}
            
            {events.map((event) => {
                const assignedNames = event.profiles.map(id => profileMap[id] || 'Unknown User').join(', ');
                
                const formattedStart = formatEventTime(event.startUtc, viewingTimezone);
                const formattedEnd = formatEventTime(event.endUtc, viewingTimezone);
                const formattedCreated = formatEventTime(event.createdAt, viewingTimezone);
                const formattedUpdated = formatEventTime(event.updatedAt, viewingTimezone);
                
                return (
                    <div key={event._id} className="p-4 bg-white rounded-xl shadow-lg border border-gray-100 transition duration-150 hover:shadow-xl">
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center text-lg font-bold text-indigo-700">
                                <Users size={20} className="mr-2 text-indigo-500" />
                                Assigned: {assignedNames}
                            </div>
                            
                            <Button 
                                onClick={() => onEditEvent(event)} 
                                className="bg-indigo-600 text-white hover:bg-indigo-700 px-3 py-1 text-sm shadow-md"
                            >
                                Edit
                            </Button>
                        </div>

                        <div className="space-y-1 text-gray-700 mb-3 border-b pb-3 border-dashed">
                            <div className="flex items-center">
                                <Calendar size={14} className="mr-2 text-green-600" />
                                <span className="font-semibold text-sm">Start:</span> {formattedStart}
                            </div>
                            <div className="flex items-center">
                                <Clock size={14} className="mr-2 text-red-600" />
                                <span className="font-semibold text-sm">End:</span> {formattedEnd}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                (Original TZ: {event.eventTimezone} | <span className="font-semibold">Viewing TZ: {viewingTimezone}</span>)
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                            <div><span className="font-medium">Created:</span> {formattedCreated}</div>
                            <div><span className="font-medium">Updated:</span> {formattedUpdated}</div>
                        </div>
                        
                        <hr className="my-3 border-gray-200" />

                        <div className="flex justify-end">
                            <Button 
                                onClick={() => onViewLog(event)} 
                                className="bg-gray-200 text-gray-700 hover:bg-gray-300 px-3 py-1 text-xs shadow-md"
                            >
                                View Log
                            </Button>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};


// --- Main Application Component ---

const App = () => {
  const [profiles, setProfiles] = useState([]);
  const [selectedProfileId, setSelectedProfileId] = useState(null);
  const [events, setEvents] = useState([]);
  const [eventToEdit, setEventToEdit] = useState(null);
  const [eventToLog, setEventToLog] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [eventLoading, setEventLoading] = useState(false);
  const [eventError, setEventError] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [globalError, setGlobalError] = useState('');
  
  const [viewingTimezone, setViewingTimezone] = useState('UTC'); 

  const initialEventState = {
    profiles: [],
    eventTimezone: 'UTC',
    startDate: new Date().toISOString().substring(0, 10),
    startTime: '10:00',
    endDate: new Date().toISOString().substring(0, 10),
    endTime: '11:00',
  };
  const [newEventData, setNewEventData] = useState(initialEventState);
  
  const selectedProfile = useMemo(() => profiles.find(p => p._id === selectedProfileId), [profiles, selectedProfileId]);

  // --- API Fetching Functions ---

  const fetchProfiles = useCallback(async (autoSelectId = null) => {
    setProfileLoading(true);
    setGlobalError('');
    try {
      const response = await fetch(`${API_BASE_URL}/profiles`);
      
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
         throw new Error(`Failed to parse response as JSON. Is the Express server running on ${API_BASE_URL}?`);
      }
      
      const data = await response.json();
      setProfiles(data);
      
      let targetId = autoSelectId || localStorage.getItem('selectedProfileId');
      
      // If the currently selected profile was just deleted, or the targetId doesn't exist,
      // fall back to the first profile in the new list, or null.
      if (!data.some(p => p._id === targetId)) {
          targetId = data[0]?._id || null;
      }
      
      setSelectedProfileId(targetId);
      if (targetId) {
          localStorage.setItem('selectedProfileId', targetId);
      } else {
          localStorage.removeItem('selectedProfileId');
      }
      
    } catch (err) {
      console.error("[CONSOLE_ERROR] Profile fetch error:", err.message);
      setGlobalError(`API Error: ${err.message}. Please ensure the backend server is running.`);
    } finally {
      setProfileLoading(false);
    }
  }, []);

  const fetchEvents = useCallback(async (id) => {
    if (!id) return;
    setEventLoading(true);
    setEventError('');
    try {
      const response = await fetch(`${API_BASE_URL}/events/${id}`);
      if (!response.ok) throw new Error('Failed to fetch events.');
      const data = await response.json();
      setEvents(data);
    } catch (err) {
      console.error("Event fetch error:", err);
      setEventError('Could not load scheduled events.');
    } finally {
      setEventLoading(false);
    }
  }, []);
  
  // --- Event Mutation Handlers ---
  
  const handleCreateEvent = async (e) => {
    e.preventDefault();
    setEventError('');
    setEventLoading(true);

    if (!newEventData.profiles || newEventData.profiles.length === 0) {
        setEventError('Please assign at least one profile.');
        setEventLoading(false);
        return;
    }

    const payload = {
      profiles: newEventData.profiles,
      startDateTime: `${newEventData.startDate}T${newEventData.startTime}:00.000Z`,
      endDateTime: `${newEventData.endDate}T${newEventData.endTime}:00.000Z`,
      eventTimezone: newEventData.eventTimezone,
    };

    try {
      const response = await fetch(`${API_BASE_URL}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'Failed to create event.');
      }

      setNewEventData(prev => ({ 
          ...initialEventState, 
          profiles: prev.profiles.length > 0 ? prev.profiles : [] 
      }));
      
      fetchEvents(selectedProfileId);
      window.alert('Event created successfully!');
      
    } catch (err) {
      console.error("Event creation failed:", err);
      setEventError(err.message);
    } finally {
      setEventLoading(false);
    }
  };

  const handleUpdateEvent = async (eventId, payload) => {
      try {
          const response = await fetch(`${API_BASE_URL}/events/${eventId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
          });

          if (!response.ok) {
              const errData = await response.json();
              throw new Error(errData.message || 'Failed to update event.');
          }
          
          setEventToEdit(null);
          fetchEvents(selectedProfileId);
          window.alert('Event updated successfully!');
      } catch (err) {
          throw err;
      }
  };
  
  const handleDeleteEvent = async (eventId) => {
      try {
          const response = await fetch(`${API_BASE_URL}/events/${eventId}`, {
              method: 'DELETE',
          });

          if (!response.ok) {
              throw new Error('Failed to delete event. Server might be unreachable.');
          }
          
          setEventToEdit(null);
          fetchEvents(selectedProfileId);
          window.alert('Event deleted successfully!');
      } catch (err) {
          throw err;
      }
  };
  
  // --- Profile Mutation Handlers ---
  
  const handleUpdateProfile = async (profileId, name, userTimezone) => {
      try {
          const response = await fetch(`${API_BASE_URL}/profiles/${profileId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name, userTimezone }),
          });

          if (!response.ok) {
              const errData = await response.json();
              throw new Error(errData.message || 'Failed to update profile.');
          }
          
          await fetchProfiles(profileId);
      } catch (err) {
          console.error("Profile update failed:", err);
          throw err; 
      }
  }
  
  const handleDeleteProfile = async (profileId) => {
      if (!profileId) throw new Error("No profile ID provided for deletion.");
      
      try {
          const response = await fetch(`${API_BASE_URL}/profiles/${profileId}`, {
              method: 'DELETE',
          });

          if (!response.ok) {
              const errData = await response.json();
              throw new Error(errData.message || 'Failed to delete profile.');
          }

          await fetchProfiles(); 
          window.alert('Profile deleted successfully! Selected profile updated.');
          
      } catch (err) {
          console.error("Profile deletion failed:", err);
          throw err;
      }
  };


  // --- useEffect Hooks ---
  
  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  useEffect(() => {
    if (selectedProfileId) {
      localStorage.setItem('selectedProfileId', selectedProfileId);
      fetchEvents(selectedProfileId);
      
      setNewEventData(prev => {
          if (!prev.profiles || prev.profiles.length === 0) {
              return { ...prev, profiles: [selectedProfileId] }; 
          }
          return prev;
      });
    } else {
      setEvents([]);
      // If no profile is selected, clear the profile assignment in the create form
      setNewEventData(prev => ({ ...prev, profiles: [] }));
    }
    
    // Update the viewing timezone based on the selected profile's default
    if (selectedProfile) {
        setViewingTimezone(selectedProfile.userTimezone);
    } else {
        setViewingTimezone('UTC');
    }
  }, [selectedProfileId, fetchEvents, selectedProfile]); 
  
  useEffect(() => {
      if (globalError) {
          const timer = setTimeout(() => setGlobalError(''), 10000);
          return () => clearTimeout(timer);
      }
  }, [globalError]);

  const PLACEHOLDER_HOVER_STYLE = `
      .input-hover-effect:hover::placeholder {
          color: white !important;
          opacity: 1;
      }
      .input-hover-effect:hover {
          color: white;
      }
      .input-hover-effect {
          color: #1f2937;
      }
  `;

  return (
    <div className="min-h-screen bg-white font-sans">
      
      <style>{PLACEHOLDER_HOVER_STYLE}</style> 
      
      {globalError && <ErrorAlert message={globalError} onClose={() => setGlobalError('')} />}

      <header className="bg-gray-100 shadow-md p-4 text-gray-900"> 
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="text-xl font-extrabold tracking-tight">
            Event Management System
            <p className="text-sm font-light text-gray-500">
                Manage events across users and timezones with reliable UTC conversion.
            </p>
          </div>
          
          <Button
            onClick={() => setIsModalOpen(true)}
            className="bg-indigo-600 text-white hover:bg-indigo-700 flex items-center shadow-lg"
          >
            <User size={18} className="mr-2" />
            Manage Profiles
          </Button>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto p-4 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* LEFT COLUMN: Create Event Form */}
          <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-2xl">
            <h1 className="text-3xl font-bold text-gray-900 mb-6 border-b pb-3">
              <Plus size={24} className="inline-block mr-2 text-indigo-600" />
              Create Event
            </h1>
            <EventFormContent
              eventData={newEventData}
              setEventData={setNewEventData}
              profiles={profiles}
              isEditing={false}
              onSubmit={handleCreateEvent}
              isLoading={eventLoading}
              buttonLabel="Create New Event"
              error={eventError}
              refreshProfiles={fetchProfiles}
            />
          </div>

          {/* RIGHT COLUMN: Current Viewer Profile & Scheduled Events */}
          <div className="lg:col-span-1 space-y-8">
            
            {/* Current Viewer Profile Card */}
            <div className="bg-white p-6 rounded-xl shadow-2xl border-t-4 border-indigo-600">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Current Viewer Profile</h2>
                {profileLoading ? (
                    <p className="text-gray-500 flex items-center"><Loader2 className="animate-spin mr-2"/> Loading profile...</p>
                ) : (
                    <div className="flex items-center space-x-4">
                        <User size={24} className="text-indigo-600" />
                        <div className="text-gray-700">
                            <p className="text-lg font-bold">{selectedProfile?.name || 'No Profile Selected'}</p>
                            <p className="text-sm text-gray-500">Timezone: {selectedProfile?.userTimezone || 'UTC'}</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Scheduled Events List */}
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6 border-b pb-3">Scheduled Events</h2>
              <ScheduledEvents 
                events={events}
                profiles={profiles}
                viewingTimezone={viewingTimezone}
                setViewingTimezone={setViewingTimezone}
                onEditEvent={setEventToEdit}
                onViewLog={setEventToLog}
                isLoading={eventLoading || profileLoading}
                error={eventError}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Profile Manager Modal */}
      <ProfileManagerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        profiles={profiles}
        selectedProfileId={selectedProfileId}
        setSelectedProfileId={setSelectedProfileId}
        refreshProfiles={fetchProfiles}
        onUpdateProfile={handleUpdateProfile}
        onDeleteProfile={handleDeleteProfile} // New prop for profile deletion
      />
      
      {/* Edit Event Modal (Controlled by eventToEdit state) */}
      {eventToEdit && (
          <EditEventModal
              event={eventToEdit}
              profiles={profiles}
              onClose={() => setEventToEdit(null)}
              onUpdate={handleUpdateEvent}
              onDelete={handleDeleteEvent}
              profileTimezone={selectedProfile?.userTimezone || 'UTC'}
              refreshProfiles={fetchProfiles}
          />
      )}

      {/* Log Viewer Modal (Controlled by eventToLog state) */}
      {eventToLog && (
        <LogViewerModal
            event={eventToLog}
            onClose={() => setEventToLog(null)}
            profiles={profiles}
        />
      )}
    </div>
  );
};

export default App;
