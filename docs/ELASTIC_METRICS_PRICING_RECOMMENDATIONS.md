# Elastic Metrics Pricing Model Recommendations

## Executive Summary

This document analyzes different pricing model options for Elastic Serverless Metrics, comparing them to competitive offerings and providing strategic recommendations. The analysis considers market positioning, customer segments, revenue implications, and competitive differentiation.

## Current Market Landscape

### Pricing Models by Vendor

| Vendor | Model | Price Point | Free Tier | Key Differentiator |
|--------|-------|------------|-----------|-------------------|
| **Observe Inc** | Per-datapoint | $0.008/1M | None | Ultra-low price, Snowflake backend |
| **New Relic** | Per-metric | $0.25/1M | 100M free | Generous free tier |
| **Grafana Cloud** | Per-metric | $0.30/1M (starting) | None | Volume discounts available |
| **Chronosphere** | Per-metric | $0.45/1M | None | Control Plane reduces volume |
| **Splunk Observability** | Per-metric | $0.55/1M | None | Enterprise-focused |
| **Dynatrace** | Per-metric | $0.60/1M | None | AI-powered, premium |
| **Datadog** | Per-metric | $0.75/1M | None | Market leader, comprehensive |
| **Elastic** (current) | Volume-based | $0.109/GB | None | Cardinality-friendly, unified platform |

### Market Segmentation

**Low-End Market** ($0.008-$0.25/1M datapoints):
- Observe Inc: Ultra-competitive, targets cost-sensitive customers
- New Relic: Free tier strategy to capture market share

**Mid-Market** ($0.30-$0.45/1M datapoints):
- Grafana Cloud: Open-source heritage, developer-friendly
- Chronosphere: Prometheus-native, cardinality optimization

**Premium Market** ($0.55-$0.75/1M datapoints):
- Splunk, Dynatrace, Datadog: Enterprise-focused, feature-rich

## Pricing Model Options Analysis

### Option 1: Volume-Based Pricing (Current Model)

**Current Implementation**: $0.109/GB/month

**How It Works**:
- Charges based on data volume (GB), not metric count
- Different metric types have different bytes per datapoint:
  - OpenTelemetry: 488 bytes/datapoint → ~$0.05/1M datapoints
  - Prometheus: 296 bytes/datapoint → ~$0.03/1M datapoints
  - Elastic Agent/Beats: 200 bytes/datapoint → ~$0.02/1M datapoints

**Pros**:
- ✅ **Cardinality-friendly**: High cardinality doesn't cause exponential cost growth
- ✅ **Predictable costs**: Customers can estimate based on data volume
- ✅ **Unified pricing**: Same model for metrics, logs, traces, security
- ✅ **Competitive for high-cardinality**: Better than per-metric for complex metrics
- ✅ **Differentiation**: Unique in the market (only Elastic uses this model)
- ✅ **Fair pricing**: Customers pay for actual resource consumption

**Cons**:
- ❌ **Complex to explain**: Requires understanding bytes per datapoint
- ❌ **Less intuitive**: Customers think in metrics, not GB
- ❌ **Competitive disadvantage**: Appears more expensive when comparing per-metric
- ❌ **Metric type variance**: Different costs for same metric count (OTel vs Prometheus)

**Competitive Position**:
- **vs. Per-Metric Platforms**: More expensive for low-cardinality, cheaper for high-cardinality
- **vs. Observe Inc**: 3-6x more expensive (but Observe is loss-leader pricing)
- **Market Fit**: Best for customers with high-cardinality metrics or unified observability needs

**Revenue Impact**: 
- Moderate: Attracts high-cardinality customers, may lose low-cardinality customers to per-metric platforms

---

### Option 2: Per-Metric Pricing (Market Standard)

**Proposed Implementation**: $0.30-$0.50 per million metrics/month

**How It Works**:
- Charges per unique metric series (including all tag combinations)
- Simple: 1 metric = 1 billed metric
- No conversion needed

**Pros**:
- ✅ **Simple to understand**: Customers immediately understand pricing
- ✅ **Market standard**: Matches competitor pricing models
- ✅ **Easy comparison**: Direct apples-to-apples comparison with competitors
- ✅ **Predictable per metric**: Same cost regardless of metric type
- ✅ **Sales-friendly**: Easy to explain and calculate

**Cons**:
- ❌ **Cardinality penalty**: High-cardinality metrics cause exponential cost growth
- ❌ **Competitive disadvantage**: Elastic loses differentiation
- ❌ **Unfair for high-cardinality**: Customers with complex metrics pay disproportionately
- ❌ **Different from logs/traces**: Breaks unified pricing model
- ❌ **Race to bottom**: Competing on price, not value

**Competitive Position**:
- **vs. Grafana**: Need to match or beat $0.30/1M (starting tier)
- **vs. Datadog**: Can be 40-60% cheaper at $0.30-$0.50/1M
- **Market Fit**: Best for low-to-medium cardinality customers

**Revenue Impact**:
- **High risk**: May need to price below market to compete, reducing margins
- **High volume**: Could attract more customers, but at lower margins

**Recommended Price Points**:
- **Entry Tier**: $0.30/1M metrics (match Grafana starting tier)
- **Standard Tier**: $0.40/1M metrics (premium but competitive)
- **Premium Tier**: $0.50/1M metrics (match Splunk/Dynatrace)

---

### Option 3: Hybrid Model (Volume-Based with Per-Metric Cap)

**Proposed Implementation**: 
- Volume-based pricing: $0.109/GB/month
- Per-metric cap: Maximum $0.50 per million metrics
- Customer pays the **lower** of the two calculations

**How It Works**:
- Calculate cost both ways (volume-based and per-metric)
- Charge the lower amount
- Protects customers from high-cardinality penalties while maintaining volume-based benefits

**Pros**:
- ✅ **Best of both worlds**: Volume-based for high-cardinality, per-metric cap for low-cardinality
- ✅ **Customer-friendly**: Never penalizes customers unfairly
- ✅ **Competitive**: Can compete with per-metric platforms on price
- ✅ **Differentiation**: Still unique in the market
- ✅ **Flexible**: Works for all customer types

**Cons**:
- ❌ **Complex to explain**: Requires understanding both models
- ❌ **Revenue risk**: May reduce revenue from high-volume, low-cardinality customers
- ❌ **Calculation complexity**: More complex billing system
- ❌ **Potential confusion**: Customers may not understand which model applies

**Competitive Position**:
- **vs. All Platforms**: Competitive on price, differentiated on model
- **Market Fit**: Universal - works for all customer segments

**Revenue Impact**:
- **Moderate risk**: May reduce revenue from some customers, but attracts more customers overall

**Example Calculation**:
- 10M metrics/month, OpenTelemetry (488 bytes/datapoint)
- Volume-based: 4.88 GB × $0.109 = $0.53
- Per-metric cap: 10M × $0.50/1M = $5.00
- **Customer pays**: $0.53 (volume-based, lower)

---

### Option 4: Tiered Per-Metric Pricing (Volume Discounts)

**Proposed Implementation**:
- **Starter Tier**: $0.50 per million metrics (0-100M/month)
- **Growth Tier**: $0.40 per million metrics (100M-1B/month)
- **Enterprise Tier**: $0.30 per million metrics (1B+/month)
- **Elite Tier**: Custom pricing (10B+/month)

**How It Works**:
- Per-metric pricing with volume discounts
- Similar to Grafana's model but with explicit tiers
- Encourages volume growth

**Pros**:
- ✅ **Market standard**: Matches Grafana's approach
- ✅ **Volume incentives**: Rewards high-volume customers
- ✅ **Simple tiers**: Easy to understand and communicate
- ✅ **Competitive**: Can match or beat Grafana at each tier
- ✅ **Sales-friendly**: Clear upgrade path

**Cons**:
- ❌ **Cardinality penalty**: Still penalizes high-cardinality metrics
- ❌ **Complex tiers**: Multiple price points to manage
- ❌ **Loses differentiation**: Same model as competitors
- ❌ **Different from logs/traces**: Breaks unified pricing

**Competitive Position**:
- **vs. Grafana**: Can match or beat at each tier
- **vs. Datadog**: 33-60% cheaper depending on tier
- **Market Fit**: Best for customers who understand tiered pricing

**Revenue Impact**:
- **Moderate**: Attracts volume customers, but may reduce margins at higher tiers

---

### Option 5: Per-Datapoint Pricing (Observe Inc Model)

**Proposed Implementation**: $0.008-$0.015 per million datapoints/month

**How It Works**:
- Charges per datapoint (not per unique metric series)
- Very low price point
- Includes retention (similar to Observe Inc)

**Pros**:
- ✅ **Ultra-competitive**: Lowest price in the market
- ✅ **Simple**: Easy to understand
- ✅ **Cardinality-friendly**: High cardinality doesn't multiply costs
- ✅ **Market disruption**: Could capture significant market share

**Cons**:
- ❌ **Low margins**: Very low price point may not be sustainable
- ❌ **Revenue risk**: May not cover infrastructure costs at scale
- ❌ **Loss-leader**: Observe Inc may be pricing below cost
- ❌ **Brand risk**: May be perceived as "cheap" rather than "premium"

**Competitive Position**:
- **vs. All Platforms**: Cheapest option
- **Market Fit**: Best for price-sensitive customers

**Revenue Impact**:
- **High risk**: Very low margins, may require high volume to be profitable

**Not Recommended**: This model appears to be a loss-leader strategy and may not be sustainable for Elastic's business model.

---

### Option 6: Hybrid Unified Model (Metrics + Logs + Traces)

**Proposed Implementation**:
- **Unified Observability**: Single pricing for metrics, logs, traces, security
- **Volume-based**: $0.109/GB/month for all data types
- **Bundle discount**: 10-20% discount for using multiple data types

**How It Works**:
- Same pricing model for all observability data
- Customers get discount for using multiple data types
- Simplifies pricing and encourages platform adoption

**Pros**:
- ✅ **Unified platform**: Single pricing model for all observability
- ✅ **Bundle strategy**: Encourages customers to use full platform
- ✅ **Differentiation**: Unique in the market
- ✅ **Value proposition**: Customers see value in unified platform
- ✅ **Upsell opportunity**: Natural path to expand usage

**Cons**:
- ❌ **Complex**: Requires tracking multiple data types
- ❌ **Billing complexity**: More complex billing system
- ❌ **Market comparison**: Harder to compare to single-purpose platforms

**Competitive Position**:
- **vs. Single-Purpose Platforms**: Harder to compare, but unique value
- **Market Fit**: Best for customers wanting unified observability

**Revenue Impact**:
- **Positive**: Encourages platform expansion, increases customer lifetime value

---

## Strategic Recommendations

### Recommended Approach: **Option 3 - Hybrid Model (Volume-Based with Per-Metric Cap)**

**Rationale**:
1. **Best of Both Worlds**: Maintains Elastic's differentiation (volume-based) while competing on price (per-metric cap)
2. **Customer-Friendly**: Never unfairly penalizes customers
3. **Competitive**: Can compete with per-metric platforms on price
4. **Differentiation**: Still unique in the market
5. **Flexible**: Works for all customer segments

**Implementation Details**:
- **Volume-based pricing**: $0.109/GB/month (current)
- **Per-metric cap**: $0.40 per million metrics/month
- **Customer pays**: Lower of the two calculations
- **Free tier option**: Consider 10M metrics/month free (similar to New Relic's approach)

**Price Point Justification**:
- **$0.40/1M metrics**: 
  - 33% more expensive than Grafana starting tier ($0.30)
  - 47% cheaper than Datadog ($0.75)
  - Competitive with Splunk ($0.55) and Dynatrace ($0.60)
  - Premium positioning without being excessive

### Alternative Recommendation: **Option 4 - Tiered Per-Metric Pricing**

**If Hybrid Model is Too Complex**:
- **Starter**: $0.50/1M metrics (0-100M/month)
- **Growth**: $0.40/1M metrics (100M-1B/month)
- **Enterprise**: $0.30/1M metrics (1B+/month)
- **Elite**: Custom pricing (10B+/month)

**Rationale**:
- Simpler to explain than hybrid model
- Matches market standard (Grafana's approach)
- Clear upgrade path for customers
- Competitive at each tier

### Not Recommended: **Option 2 - Pure Per-Metric Pricing**

**Why Not**:
- Loses Elastic's key differentiation (cardinality-friendly)
- Competes on price, not value
- Unfair to high-cardinality customers
- Breaks unified pricing model

---

## Implementation Considerations

### Technical Requirements

**For Hybrid Model (Option 3)**:
- Calculate costs using both models
- Compare and select lower amount
- Billing system must support dual calculations
- Reporting must show both calculations for transparency

**For Tiered Model (Option 4)**:
- Track monthly metric volume
- Apply appropriate tier pricing
- Handle tier transitions mid-month
- Reporting for tier usage

### Sales Enablement

**Key Messages**:
1. **Hybrid Model**: "Pay for what you use (volume) or per-metric, whichever is lower"
2. **Cardinality Advantage**: "High-cardinality metrics don't cause exponential cost growth"
3. **Unified Platform**: "Same pricing model for metrics, logs, traces, security"
4. **Competitive**: "Competitive with Grafana, cheaper than Datadog"

**Sales Tools Needed**:
- Pricing calculator (already exists)
- Comparison charts vs. competitors
- ROI calculator for high-cardinality scenarios
- Case studies showing cost savings

### Customer Communication

**Migration Strategy** (if changing from current model):
- Grandfather existing customers for 12 months
- Provide migration calculator
- Offer consultation to optimize costs
- Clear communication about changes

**Documentation**:
- Update pricing page with new model
- Create comparison guides
- Provide examples and use cases
- FAQ addressing common questions

---

## Competitive Analysis by Customer Segment

### High-Cardinality Customers (100M+ unique metric series)

**Current Elastic Advantage**: ✅ Volume-based model is cheaper
**With Hybrid Model**: ✅ Still cheaper (volume-based applies)
**With Per-Metric Model**: ❌ Would be more expensive than competitors

**Recommendation**: Hybrid model maintains advantage

### Low-Cardinality Customers (<10M unique metric series)

**Current Elastic Disadvantage**: ❌ Volume-based appears more expensive
**With Hybrid Model**: ✅ Per-metric cap makes it competitive
**With Per-Metric Model**: ✅ Competitive

**Recommendation**: Hybrid model fixes disadvantage

### Medium-Cardinality Customers (10M-100M unique metric series)

**Current Elastic**: ⚠️ Depends on metric type and data volume
**With Hybrid Model**: ✅ Competitive either way
**With Per-Metric Model**: ✅ Competitive

**Recommendation**: Hybrid model works best

### Unified Observability Customers (Metrics + Logs + Traces)

**Current Elastic Advantage**: ✅ Unified pricing model
**With Hybrid Model**: ✅ Maintains unified model
**With Per-Metric Model**: ❌ Breaks unified model

**Recommendation**: Hybrid model maintains advantage

---

## Revenue Impact Analysis

### Scenario 1: Hybrid Model ($0.40/1M cap)

**Assumptions**:
- 1,000 customers
- Average: 50M metrics/month per customer
- 60% low-cardinality (per-metric cap applies)
- 40% high-cardinality (volume-based applies)

**Revenue Calculation**:
- Low-cardinality: 600 customers × 50M × $0.40/1M = $12M/month
- High-cardinality: 400 customers × (volume-based, avg $0.05/1M) = $1M/month
- **Total**: $13M/month = **$156M/year**

**vs. Current Model**:
- All customers: 1,000 × (volume-based, avg $0.05/1M) = $2.5M/month
- **Total**: $2.5M/month = **$30M/year**

**Impact**: +420% revenue increase (but assumes 10x customer growth)

### Scenario 2: Tiered Per-Metric Model

**Assumptions**:
- Same customer base
- 20% Starter, 50% Growth, 25% Enterprise, 5% Elite

**Revenue Calculation**:
- Starter: 200 × 50M × $0.50/1M = $5M/month
- Growth: 500 × 50M × $0.40/1M = $10M/month
- Enterprise: 250 × 50M × $0.30/1M = $3.75M/month
- Elite: 50 × 50M × $0.25/1M (custom) = $0.625M/month
- **Total**: $19.375M/month = **$232.5M/year**

**Impact**: Higher revenue potential, but requires customer acquisition

---

## Final Recommendations

### Primary Recommendation: **Hybrid Model (Volume-Based with Per-Metric Cap)**

**Implementation**:
- Volume-based: $0.109/GB/month
- Per-metric cap: $0.40 per million metrics/month
- Customer pays: Lower of the two
- Free tier: 10M metrics/month (optional)

**Why This Model**:
1. ✅ Maintains Elastic's differentiation (cardinality-friendly)
2. ✅ Competes on price (per-metric cap)
3. ✅ Works for all customer segments
4. ✅ Maintains unified pricing model
5. ✅ Customer-friendly (never penalizes unfairly)

### Secondary Recommendation: **Tiered Per-Metric Pricing**

**If Hybrid Model is Too Complex**:
- Starter: $0.50/1M (0-100M/month)
- Growth: $0.40/1M (100M-1B/month)
- Enterprise: $0.30/1M (1B+/month)
- Elite: Custom (10B+/month)

**Why This Model**:
1. ✅ Simple to understand and explain
2. ✅ Matches market standard (Grafana)
3. ✅ Clear upgrade path
4. ✅ Competitive at each tier

### Not Recommended: **Pure Per-Metric Pricing**

**Why Not**:
- ❌ Loses key differentiation
- ❌ Unfair to high-cardinality customers
- ❌ Breaks unified pricing model
- ❌ Competes on price, not value

---

## Next Steps

1. **Validate Recommendations**: 
   - Review with product, sales, and finance teams
   - Analyze customer feedback and usage patterns
   - Consider competitive response

2. **Pilot Program**:
   - Test hybrid model with select customers
   - Gather feedback and usage data
   - Refine pricing based on results

3. **Implementation Planning**:
   - Update billing system
   - Create sales enablement materials
   - Update pricing documentation
   - Plan customer communication

4. **Go-to-Market**:
   - Launch new pricing model
   - Train sales team
   - Update marketing materials
   - Monitor competitive response

---

## Appendix: Competitive Pricing Comparison

### Per 1 Million Datapoints (OpenTelemetry, 488 bytes/datapoint)

| Platform | Price/1M Datapoints | vs Elastic (Current) | vs Elastic (Hybrid @ $0.40) |
|----------|---------------------|----------------------|------------------------------|
| Observe Inc | $0.008 | 6.25x cheaper | 50x cheaper |
| New Relic | $0.25 | 5x more expensive | 1.6x more expensive |
| Grafana Cloud | $0.30 | 6x more expensive | 1.33x more expensive |
| **Elastic (Hybrid)** | **$0.40** | **N/A** | **Baseline** |
| Chronosphere | $0.45 | 9x more expensive | 1.125x more expensive |
| Splunk Observability | $0.55 | 11x more expensive | 1.375x more expensive |
| Dynatrace | $0.60 | 12x more expensive | 1.5x more expensive |
| Datadog | $0.75 | 15x more expensive | 1.875x more expensive |
| **Elastic (Current)** | **~$0.05** | **Baseline** | **8x cheaper** |

### Per 1 Million Datapoints (Prometheus, 296 bytes/datapoint)

| Platform | Price/1M Datapoints | vs Elastic (Current) | vs Elastic (Hybrid @ $0.40) |
|----------|---------------------|----------------------|------------------------------|
| Observe Inc | $0.008 | 3.75x cheaper | 50x cheaper |
| New Relic | $0.25 | 8.3x more expensive | 1.6x more expensive |
| Grafana Cloud | $0.30 | 10x more expensive | 1.33x more expensive |
| **Elastic (Hybrid)** | **$0.40** | **N/A** | **Baseline** |
| Chronosphere | $0.45 | 15x more expensive | 1.125x more expensive |
| Splunk Observability | $0.55 | 18.3x more expensive | 1.375x more expensive |
| Dynatrace | $0.60 | 20x more expensive | 1.5x more expensive |
| Datadog | $0.75 | 25x more expensive | 1.875x more expensive |
| **Elastic (Current)** | **~$0.03** | **Baseline** | **13.3x cheaper** |

---

**Document Version**: 1.0  
**Last Updated**: January 2025  
**Author**: Pricing Strategy Analysis  
**Status**: Recommendations for Review
