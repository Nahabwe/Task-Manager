
const express = require("express");
const pool = require("../db");
const authenticateToken = require("../middleware/authenticateToken");

const router = express.Router();

// Every task route requires a valid login token.
router.use(authenticateToken);

// GET /tasks
// Supports filtering, searching, pagination, and sorting.
router.get("/", async (req, res) => {
  // Validate pagination options.
  const page =
    req.query.page === undefined ? 1 : Number(req.query.page);

  const limit =
    req.query.limit === undefined ? 10 : Number(req.query.limit);

  if (
    !Number.isSafeInteger(page) ||
    page < 1 ||
    !Number.isSafeInteger(limit) ||
    limit < 1 ||
    limit > 100 ||
    !Number.isSafeInteger((page - 1) * limit)
  ) {
    return res.status(400).json({
      message: "Page must be positive, and limit must be between 1 and 100"
    });
  }

  // Validate sorting options.
  const allowedSortFields = ["id", "title", "completed"];

  const sortBy =
    req.query.sortBy === undefined ? "id" : req.query.sortBy;

  const order =
    req.query.order === undefined
      ? "asc"
      : req.query.order;

  if (
    typeof sortBy !== "string" ||
    !allowedSortFields.includes(sortBy) ||
    typeof order !== "string" ||
    !["asc", "desc"].includes(order)
  ) {
    return res.status(400).json({
      message: "Invalid sorting options"
    });
  }

  const sortDirection = order.toUpperCase();

  // Start with the authenticated user's tasks only.
  const conditions = ["user_id = $1"];
  const params = [req.user.id];

  // Filter by completion status.
  if (req.query.completed !== undefined) {
    if (
      req.query.completed !== "true" &&
      req.query.completed !== "false"
    ) {
      return res.status(400).json({
        message: "Completed must be true or false"
      });
    }

    params.push(req.query.completed === "true");
    conditions.push(`completed = $${params.length}`);
  }

  // Search task titles, ignoring letter case.
  if (req.query.search !== undefined) {
    if (
      typeof req.query.search !== "string" ||
      req.query.search.trim().length === 0 ||
      req.query.search.trim().length > 200
    ) {
      return res.status(400).json({
        message: "Search must contain 1 to 200 characters"
      });
    }

    // Escape wildcard characters so search is literal.
    const searchTerm = req.query.search.trim().replace(/[\\%_]/g, "\\$&");

    params.push(`%${searchTerm}%`);
    conditions.push(`title ILIKE $${params.length} ESCAPE '\\'`);
  }

  // Construct the WHERE clause from validated conditions.
  const whereClause = conditions.join(" AND ");

  try {
    // Count all matching tasks belonging to this user.
    const countResult = await pool.query(
      `SELECT COUNT(*) AS total
       FROM tasks
       WHERE ${whereClause}`,
      params
    );

    const totalItems = Number(countResult.rows[0].total);
    const totalPages = Math.ceil(totalItems / limit);

    // Calculate the number of tasks to skip.
    const offset = (page - 1) * limit;

    // Column names and directions are allowlisted above.
    const orderClause =
      sortBy === "id"
        ? `id ${sortDirection}`
        : `${sortBy} ${sortDirection}, id ASC`;

    // Retrieve the requested page.
    const dataParams = [...params, limit, offset];

    const result = await pool.query(
      `SELECT *
       FROM tasks
       WHERE ${whereClause}
       ORDER BY ${orderClause}
       LIMIT $${params.length + 1}
       OFFSET $${params.length + 2}`,
      dataParams
    );

    return res.status(200).json({
      data: result.rows,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages
      },
      sorting: {
        sortBy,
        order
      }
    });
  } catch (error) {
    console.error("Failed to fetch tasks:", error.message);

    return res.status(500).json({
      message: "Failed to fetch tasks"
    });
  }
});

// GET /tasks/:id
// Retrieve one task belonging to the logged-in user.
router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isSafeInteger(id) || id < 1) {
    return res.status(400).json({
      message: "Invalid task ID"
    });
  }

  try {
    const result = await pool.query(
      `SELECT *
       FROM tasks
       WHERE id = $1 AND user_id = $2`,
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Task not found"
      });
    }

    return res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("Failed to retrieve task:", error.message);

    return res.status(500).json({
      message: "Failed to retrieve task"
    });
  }
});

// POST /tasks
// Create a task owned by the logged-in user.
router.post("/", async (req, res) => {
  const { title, completed } = req.body || {};

  if (typeof title !== "string" || !title.trim()) {
    return res.status(400).json({
      message: "Title is required"
    });
  }

  if (
    completed !== undefined &&
    typeof completed !== "boolean"
  ) {
    return res.status(400).json({
      message: "Completed must be a boolean"
    });
  }

  try {
    const result = await pool.query(
      `INSERT INTO tasks (title, completed, user_id)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [
        title.trim(),
        completed === undefined ? false : completed,
        req.user.id
      ]
    );

    return res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Failed to create task:", error.message);

    return res.status(500).json({
      message: "Failed to create task"
    });
  }
});

// PATCH /tasks/:id
// Update only a task belonging to the logged-in user.
router.patch("/:id", async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isSafeInteger(id) || id < 1) {
    return res.status(400).json({
      message: "Invalid task ID"
    });
  }

  const { title, completed } = req.body || {};

  if (title === undefined && completed === undefined) {
    return res.status(400).json({
      message: "Provide a title or completed value"
    });
  }

  if (
    title !== undefined &&
    (typeof title !== "string" || !title.trim())
  ) {
    return res.status(400).json({
      message: "Title must be a non-empty string"
    });
  }

  if (
    completed !== undefined &&
    typeof completed !== "boolean"
  ) {
    return res.status(400).json({
      message: "Completed must be a boolean"
    });
  }

  try {
    const result = await pool.query(
      `UPDATE tasks
       SET title = COALESCE($1, title),
           completed = COALESCE($2, completed)
       WHERE id = $3 AND user_id = $4
       RETURNING *`,
      [
        title === undefined ? null : title.trim(),
        completed === undefined ? null : completed,
        id,
        req.user.id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Task not found"
      });
    }

    return res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("Failed to update task:", error.message);

    return res.status(500).json({
      message: "Failed to update task"
    });
  }
});

// DELETE /tasks/:id
// Delete only a task belonging to the logged-in user.
router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isSafeInteger(id) || id < 1) {
    return res.status(400).json({
      message: "Invalid task ID"
    });
  }

  try {
    const result = await pool.query(
      `DELETE FROM tasks
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Task not found"
      });
    }

    return res.status(200).json({
      message: "Task deleted successfully",
      task: result.rows[0]
    });
  } catch (error) {
    console.error("Failed to delete task:", error.message);

    return res.status(500).json({
      message: "Failed to delete task"
    });
  }
});

module.exports = router;
