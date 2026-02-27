import { getDB } from "../config/db.js";

// ─── Get Admin Dashboard Statistics ──────────────────────────────────────────
// Aggregates: total donors, donation requests, funding total,
// blood group distribution, and daily funding for last 30 days
export const getDashboardStats = async (req, res) => {
  try {
    const db = getDB();

    const totalUsers = await db.collection("users").countDocuments({ role: "donor" });
    const totalDonationRequests = await db.collection("donations").countDocuments();

    // Sum all funding amounts
    const fundingResult = await db
      .collection("funding")
      .aggregate([{ $group: { _id: null, total: { $sum: "$amount" } } }])
      .toArray();

    const totalFunding = fundingResult.length > 0 ? fundingResult[0].total : 0;

    // Count donations grouped by blood group for pie chart
    const bloodGroupStats = await db
      .collection("donations")
      .aggregate([{ $group: { _id: "$bloodGroup", count: { $sum: 1 } } }])
      .toArray();

    const bloodGroupDistribution = bloodGroupStats.map((item) => ({
      name: item._id,
      value: item.count,
    }));

    // Daily funding for the last 30 days (for line/bar chart)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailyFundingData = await db
      .collection("funding")
      .aggregate([
        { $match: { paidAt: { $gte: thirtyDaysAgo } } },
        {
          $group: {
            _id: {
              year: { $year: "$paidAt" },
              month: { $month: "$paidAt" },
              day: { $dayOfMonth: "$paidAt" },
            },
            funding: { $sum: "$amount" },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
        {
          $project: {
            _id: 0,
            // Format as "Jan 5", "Feb 14", etc. for the chart X axis
            month: {
              $concat: [
                {
                  $let: {
                    vars: {
                      monthsInString: [
                        "", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
                        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
                      ],
                    },
                    in: { $arrayElemAt: ["$$monthsInString", "$_id.month"] },
                  },
                },
                " ",
                { $toString: "$_id.day" },
              ],
            },
            funding: 1,
          },
        },
      ])
      .toArray();

    res.send({
      totalUsers,
      totalFunding,
      totalDonationRequests,
      bloodGroupDistribution,
      monthlyFundingData: dailyFundingData,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Failed to load dashboard stats" });
  }
};
