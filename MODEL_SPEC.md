# Model specification 0.1

Implement and test the static equations first, then the discrete state machine and guided presets. Build the React interface against the same functions. Verify the built app under a static subpath before publishing source and preview.

Model A uses weekly standard jobs and monetary units (MU). Model B uses abstract periods (no calendar mapping), standardized output units and MU. All data are synthetic. Continuous quantities represent expected flows. UI rounds to two decimal places, exports preserve floating-point values.

## Static markets

Maya sells min(K, max(0, (a − p)/b)) jobs. Revenue is price times sold output. Recognized cost is overhead plus unit cost times sales. Economic operating profit additionally deducts owner labor and the opportunity cost of any owned capital. The leased baseline has no owned-capital charge or cash-flow schedule.

The competitive market clears capped marginal-cost supply against linear demand on [0, A]. Bisection stops after 50 iterations, with a shortcut for identical, unconstrained or uniformly capacity-bound plants. Zero trade has zero revenue and a null transaction price. Committed overhead and owner time accrue even if q = 0. Current production is chosen to cover incremental variable costs. A firm with no positive variable contribution produces zero. Average economic cost is undefined at zero output. The free-entry reference is conditional on replicable technology, price taking, feasible capacity, A above break-even price, and free entry. Integer entry is governed by strictly positive expected value, with a 1e−8 MU numerical deadband.

## Period clock

1. Apply disclosed demand intercept shocks.
2. Activate dated commitments in the order made. Entry starts the small plant. Resizing replaces the incumbent plant. Exit releases it.
3. Update the two awareness channels independently by I ← I + λ(ceiling − I).
4. Clear the market with active plants and record production and costs.
5. Review informed waiting founders in ascending ID order, updating announced commitments after each acceptance.
6. At multiples of the review interval, review active firms in ascending ID order. A firm with a pending commitment skips review. Choose the greatest of discounted continuation, resizing net of its transition cost, or exit with zero future flows. Exit requires negative continuation and no positive resizing value. Exit takes effect next period, and an exited founder cannot reenter.

## Forecast and accounting

Each decision compares future resource-adjusted operating flows for h = 1 … H. Hold this period’s demand fixed and apply announced changes to the competitive market on their due dates. For resizing, subtract a separate market forecast with the old plant retained while both paths include the same other commitments. The existing plant stays open until delivery. Before delivery the incremental resizing flow is zero. Forecasts use intervals between dated events and discount each interval’s constant flow with a geometric sum. Zero rate uses interval length. Setup and resize payments occur at commitment. Interim costs, salvage, debt and taxes are zero or outside the model. Owner opportunity cost is included as a resource cost, leases are in recognized overhead, and no additional capital charge is deducted. Cumulative discounted net return sums sector operating surplus less cash commitments, discounted to period zero. It measures resource-adjusted returns for this accounting boundary, rather than bank cash or complete social welfare.

## Parameter dictionary

| Parameter | Meaning and baseline |
|---|---|
| A, B | Base demand choke price 120 MU/unit and slope 0.2 (MU/unit)/(units/period) |
| F, c, d, K | Committed economic overhead, variable cost intercept, MC slope, output capacity |
| Small | F 100, c 20, d 2, K 25; recognized overhead 70 and owner labor 30 |
| Large | F 220, c 20, d 1.1, K 60; recognized overhead 190 and owner labor 30 |
| A shock | Permanent signed intercept change starting at its named period; demand intercept is floored at zero |
| α | Demand gain per unit of customer awareness; benchmark 0 |
| I, ceiling, λ | Initial share, maximum share, and fraction of remaining gap closed per period, each in [0,1] |
| M | 100 external founders; the first floor(M × founder awareness) ordered IDs know the opportunity |
| Entry/resize switch | Whether new founder applications or incumbent changes of plant size can be approved |
| S, S_resize | Upfront nonnegative cash commitments; default 0 and 150 MU |
| L | Positive integer activation delay; default 1 entry, 4 resize |
| H, r | 120 future periods, 1% discount rate per period |
| Initial count, periods, review interval | 20 small firms, 24 displayed periods, incumbent review every 4 periods |

A run’s horizon is a display choice. A period with no decision and no pipeline is reported as such. Awareness, future shocks, review dates, and expectations may still change outcomes. No dynamic equilibrium or educational effectiveness is inferred.
