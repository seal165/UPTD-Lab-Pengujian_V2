const db = require('../config/database');

const globalSettings = async (req, res, next) => {
    try {
        const [rows] = await db.query('SELECT setting_key, setting_value FROM settings');
        const settings = {};
        rows.forEach(row => {
            settings[row.setting_key] = row.setting_value;
        });
        
        // Pass to Express Locals for EJS
        res.locals.settings = settings;
        
        // Pass to Request Object for Controllers
        req.settings = settings;
        
        next();
    } catch (error) {
        console.error('Error fetching global settings:', error);
        res.locals.settings = {};
        req.settings = {};
        next();
    }
};

module.exports = globalSettings;
