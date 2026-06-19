"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LabelController = void 0;
const label_service_1 = require("../services/label.service");
const error_middleware_1 = require("../middleware/error.middleware");
class LabelController {
    static listLabels = (0, error_middleware_1.asyncHandler)(async (req, res) => {
        const { projectId } = req.params;
        const labels = await label_service_1.LabelService.getProjectLabels(projectId);
        res.json({ success: true, data: labels, timestamp: new Date() });
    });
    static createLabel = (0, error_middleware_1.asyncHandler)(async (req, res) => {
        const { projectId } = req.params;
        const { name, color } = req.body;
        const label = await label_service_1.LabelService.createLabel(projectId, name, color || '#6366F1');
        res.status(201).json({ success: true, data: label, timestamp: new Date() });
    });
    static updateLabel = (0, error_middleware_1.asyncHandler)(async (req, res) => {
        const { id } = req.params;
        const { name, color } = req.body;
        const label = await label_service_1.LabelService.updateLabel(id, name, color);
        res.json({ success: true, data: label, timestamp: new Date() });
    });
    static deleteLabel = (0, error_middleware_1.asyncHandler)(async (req, res) => {
        const { id } = req.params;
        await label_service_1.LabelService.deleteLabel(id);
        res.status(204).send();
    });
    static assignLabel = (0, error_middleware_1.asyncHandler)(async (req, res) => {
        const { taskId } = req.params;
        const { labelId } = req.body;
        await label_service_1.LabelService.assignLabelToTask(taskId, labelId);
        res.json({ success: true, message: 'Label assigned', timestamp: new Date() });
    });
    static removeLabel = (0, error_middleware_1.asyncHandler)(async (req, res) => {
        const { taskId, labelId } = req.params;
        await label_service_1.LabelService.removeLabelFromTask(taskId, labelId);
        res.json({ success: true, message: 'Label removed', timestamp: new Date() });
    });
}
exports.LabelController = LabelController;
