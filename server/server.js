

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');


async function startServer() {
  
    const { v4: uuidv4 } = await import('uuid');

    const app = express();
    const PORT = 3000;

    // --- Middleware Setup ---
    app.use(cors()); 
    app.use(bodyParser.json()); 
    // --- In-Memory Database Simulation ---
    const db = {
        profiles: [],
        events: [],
        logs: [] 
    };

    // --- Initial Seed Data ---
    // Ensure the system starts with at least one profile for immediate testing
    db.profiles.push({
        _id: uuidv4(),
        name: 'Default User',
        userTimezone: 'America/New_York',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    });

    // --- Helper Functions ---

    /**
     * Creates a log entry for a specific action.
     * @param {string} type - The type of event (e.g., 'EVENT_CREATED', 'PROFILE_UPDATED')
     * @param {string} entityId - The ID of the entity that was acted upon.
     * @param {string} description - A detailed, human-readable description of the action.
     */
    function recordLog(type, entityId, description) {
        const logEntry = {
            id: uuidv4(),
            timestamp: new Date().toISOString(),
            eventType: type,
            entityId: entityId,
            description: description
        };
        db.logs.push(logEntry);
        console.log(`[LOG ${type}] Entity: ${entityId}, Description: ${description}`);
    }

    /**
     * Resolves an array of profile IDs into a comma-separated string of names for logging.
     * @param {string[]} profileIds - Array of profile IDs.
     * @returns {string} Comma-separated profile names.
     */
    function getProfileNames(profileIds) {
        return profileIds.map(id => {
            const profile = db.profiles.find(p => p._id === id);
            return profile ? profile.name : `Unknown Profile (${id.substring(0, 4)}...)`;
        }).join(', ');
    }

    // --- PROFILE ROUTES ---

    // GET /api/profiles - List all profiles
    app.get('/api/profiles', (req, res) => {
        return res.json(db.profiles);
    });

    // POST /api/profiles - Create a new profile
    app.post('/api/profiles', (req, res) => {
        const { name } = req.body;
        
        if (!name || typeof name !== 'string') {
            return res.status(400).json({ message: 'Profile name is required and must be a string.' });
        }

        const newProfile = {
            _id: uuidv4(),
            name: name,
            userTimezone: 'America/New_York', // Default timezone for new profiles
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        db.profiles.push(newProfile);
        
        // Log the creation
        recordLog('PROFILE_CREATED', newProfile._id, `New profile "${name}" created.`);

        return res.status(201).json(newProfile);
    });

    // --- EVENT ROUTES ---

    // GET /api/events/:profileId - List events for a specific profile
    app.get('/api/events/:profileId', (req, res) => {
        const { profileId } = req.params;
        
        // This filtering supports multi-user assignment: it checks if the events' profiles array includes the requested profileId
        const profileEvents = db.events.filter(e => e.profiles.includes(profileId));

        // Sort by start date (earliest first)
        profileEvents.sort((a, b) => new Date(a.startUtc) - new Date(b.startUtc));

        return res.json(profileEvents);
    });

    // POST /api/events - Create a new event
    app.post('/api/events', (req, res) => {
        const { profiles, startDateTime, endDateTime, eventTimezone } = req.body;

        if (!profiles || !startDateTime || !endDateTime || !eventTimezone) {
            return res.status(400).json({ message: 'Missing required fields: profiles, startDateTime, endDateTime, or eventTimezone.' });
        }
        
        // --- Critical Logic: Store UTC Time for reliability ---
        const startLocal = new Date(startDateTime);
        const endLocal = new Date(endDateTime);

        if (isNaN(startLocal.getTime()) || isNaN(endLocal.getTime())) {
             return res.status(400).json({ message: 'Invalid start or end date/time format.' });
        }
        
        if (startLocal >= endLocal) {
             return res.status(400).json({ message: 'Start time must be before end time.' });
        }
        
        const newEvent = {
            _id: uuidv4(),
            profiles: profiles, // Array of profile IDs (supports multiple users)
            startUtc: startLocal.toISOString(), // Store as UTC ISO string
            endUtc: endLocal.toISOString(),     // Store as UTC ISO string
            eventTimezone: eventTimezone, // The timezone the event was originally scheduled in
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        db.events.push(newEvent);

        // Log the creation with all assigned profile names
        const assignedProfiles = getProfileNames(profiles);
        recordLog('EVENT_CREATED', newEvent._id, `Event created for profiles: ${assignedProfiles}. Schedule: ${newEvent.startUtc} to ${newEvent.endUtc} in ${eventTimezone}.`);

        return res.status(201).json(newEvent);
    });


    // PUT /api/events/:id - Update an existing event
    app.put('/api/events/:id', (req, res) => {
        const { id } = req.params;
        const { profiles, startDateTime, endDateTime, eventTimezone } = req.body;

        const eventIndex = db.events.findIndex(e => e._id === id);

        if (eventIndex === -1) {
            return res.status(404).json({ message: 'Event not found.' });
        }

        if (!profiles || !startDateTime || !endDateTime || !eventTimezone) {
            return res.status(400).json({ message: 'Missing required fields for update.' });
        }

        const startLocal = new Date(startDateTime);
        const endLocal = new Date(endDateTime);

        if (isNaN(startLocal.getTime()) || isNaN(endLocal.getTime()) || startLocal >= endLocal) {
             return res.status(400).json({ message: 'Invalid or overlapping date/time provided.' });
        }
        
        const updatedEvent = {
            ...db.events[eventIndex],
            profiles: profiles, // Array of profile IDs (supports multiple users)
            startUtc: startLocal.toISOString(),
            endUtc: endLocal.toISOString(),
            eventTimezone: eventTimezone,
            updatedAt: new Date().toISOString()
        };

        db.events[eventIndex] = updatedEvent;
        
        // Log the update with all assigned profile names
        const assignedProfiles = getProfileNames(profiles);
        recordLog('EVENT_UPDATED', id, `Event updated. Assigned profiles: ${assignedProfiles}. New schedule: ${updatedEvent.startUtc} to ${updatedEvent.endUtc}.`);

        return res.json(updatedEvent);
    });

    // DELETE /api/events/:id - Delete an event
    app.delete('/api/events/:id', (req, res) => {
        const { id } = req.params;
        const initialLength = db.events.length;
        
        db.events = db.events.filter(e => e._id !== id);

        if (db.events.length === initialLength) {
            return res.status(404).json({ message: 'Event not found.' });
        }

        // Log the deletion
        recordLog('EVENT_DELETED', id, `Event successfully deleted.`);

        return res.status(204).send(); 
    });


    // --- LOGS ROUTE (Optional: For debugging/viewing all logs) ---
    app.get('/api/logs', (req, res) => {
        // Return logs sorted by timestamp, newest first
        const sortedLogs = [...db.logs].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        return res.json(sortedLogs);
    });


    // --- Server Initialization ---
    app.listen(PORT, () => {
        console.log('--------------------------------------------------');
        console.log(`✅ Event Management Backend running on port ${PORT}`);
        console.log(`   -> API available at http://localhost:${PORT}/api/`);
        console.log('--------------------------------------------------');
        console.log('Remember to run your React app (default port 5173)');
        console.log('--------------------------------------------------');
    });

}


startServer().catch(err => {
    console.error("Failed to start server due to critical error:", err.message);
    process.exit(1);
});
