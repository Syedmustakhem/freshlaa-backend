const HomeSection = require("../models/HomeSection");

// ─── GET ALL ACTIVE HOME SECTIONS (sorted by order) ──────────
exports.getHomeLayout = async (req, res) => {
    try {
        const sections = await HomeSection.find({ isActive: true })
            .sort({ order: 1 });

        console.log(`🏠 Sending ${sections.length} sections to app. Types:`, sections.map(s => `${s.type}(${s.order})`).join(", "));
        return res.json({ success: true, sections });
    } catch (err) {
        console.error("HomeLayout Error:", err);
        return res.status(500).json({ success: false, error: err.message });
    }
};

// ─── ADMIN: GET ALL SECTIONS (active + inactive) ─────────────
exports.getAllSections = async (req, res) => {
    try {
        const sections = await HomeSection.find().sort({ order: 1 });
        return res.json({ success: true, sections });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};

// ─── ADMIN: TOGGLE SECTION ACTIVE STATE ──────────────────────
exports.toggleSection = async (req, res) => {
    try {
        const { id } = req.params;
        const section = await HomeSection.findById(id);
        if (!section) return res.status(404).json({ success: false, message: "Section not found" });

        section.isActive = !section.isActive;
        await section.save();

        return res.json({ success: true, section });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};

// ─── ADMIN: UPDATE SECTION ORDER ─────────────────────────────
exports.updateOrder = async (req, res) => {
    try {
        const { sections, order } = req.body;
        const items = sections || order;

        if (!Array.isArray(items)) {
            return res.status(400).json({ success: false, message: "Invalid payload: sections or order array required" });
        }

        console.log(`🔄 Reordering ${items.length} sections...`);
        await Promise.all(
            items.map((item) => {
                const id = item._id || item.id;
                const order = Number(item.order);
                console.log(`   - Updating section ${id} to order ${order}`);
                return HomeSection.findByIdAndUpdate(id, { order });
            })
        );
        return res.json({ success: true, message: "Order updated successfully" });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};