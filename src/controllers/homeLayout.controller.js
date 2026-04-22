const HomeSection = require("../models/HomeSection");

// ─── GET ALL ACTIVE HOME SECTIONS (sorted by order) ──────────
exports.getHomeLayout = async (req, res) => {
    try {
        const sections = await HomeSection.find({ isActive: true })
            .sort({ order: 1 });

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
        const { sections } = req.body; // [{ _id, order }, ...]
        await Promise.all(
            sections.map(({ _id, order }) =>
                HomeSection.findByIdAndUpdate(_id, { order })
            )
        );
        return res.json({ success: true });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};