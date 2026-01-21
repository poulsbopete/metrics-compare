# Elastic Metrics Pricing Model Recommendations

## Executive Summary

This document analyzes different pricing model options for Elastic Serverless Metrics, comparing them to competitive offerings and providing strategic recommendations. The analysis considers market positioning, customer segments, revenue implications, competitive differentiation, and **retention costs**.

**Key Finding**: Many competitors (Grafana Cloud, Observe Inc, Datadog, Chronosphere) include **13-month retention** in their base pricing. Elastic's current volume-based pricing with 13-month retention ($0.337/GB/month) makes it **2x more expensive** than Grafana Cloud for customers requiring long-term retention. **Recommendation**: Include 13-month retention in base price to remain competitive.

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

**Current Implementation**: $0.109/GB/month (1-month retention)

**13-Month Retention Cost**: $0.337/GB total ($0.09 ingest + $0.247 retention)

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

## Retention Cost Analysis

### The 13-Month Retention Challenge

Many competitors (including Grafana Cloud, Observe Inc, and others) offer **13-month retention included** in their base pricing, which is a significant competitive advantage for customers requiring long-term data retention for compliance, historical analysis, or trend analysis.

### Elastic's Current Retention Model

**Current Pricing Structure**:
- **Ingest**: $0.09/GB ingested (one-time charge)
- **Retention**: $0.019/GB retained per month (ongoing charge)
- **Total (1 month)**: $0.109/GB/month

**13-Month Retention Cost**:
- **Ingest**: $0.09/GB (one-time)
- **Retention**: $0.019/GB × 13 months = $0.247/GB
- **Total (13 months)**: $0.337/GB

**Key Insight**: For 13-month retention, Elastic's total cost is **3.1x higher** than the 1-month retention price ($0.337 vs $0.109).

### Competitive Retention Comparison

#### Per-Metric Platforms with 13-Month Retention Included

| Platform | Price/1M Metrics | Retention Included | Notes |
|----------|------------------|-------------------|-------|
| **Grafana Cloud** | $0.30/1M (starting) | 13 months | Retention included in base price |
| **Observe Inc** | $0.008/1M | 13 months | Ultra-low price with retention included |
| **New Relic** | $0.25/1M | 30 days (default) | Extended retention available at additional cost |
| **Datadog** | $0.75/1M | 15 months | Retention included in base price |
| **Chronosphere** | $0.45/1M | 13 months | Retention included in base price |

#### Elastic with 13-Month Retention

**For OpenTelemetry metrics** (488 bytes/datapoint):
- **1-month retention**: ~$0.05/1M datapoints
- **13-month retention**: ~$0.15/1M datapoints (3x increase)

**For Prometheus metrics** (296 bytes/datapoint):
- **1-month retention**: ~$0.03/1M datapoints
- **13-month retention**: ~$0.10/1M datapoints (3.3x increase)

**For Elastic Agent/Beats** (200 bytes/datapoint):
- **1-month retention**: ~$0.02/1M datapoints
- **13-month retention**: ~$0.07/1M datapoints (3.5x increase)

### Competitive Impact Analysis

#### Scenario: 1 Billion Metrics/Month with 13-Month Retention

**OpenTelemetry Metrics** (488 bytes/datapoint):

| Platform | Monthly Cost | Annual Cost | vs Elastic (13mo) |
|----------|--------------|-------------|-------------------|
| **Observe Inc** | $8,000 | $96,000 | 18.75x cheaper |
| **Grafana Cloud** | $300,000 | $3,600,000 | 2x more expensive |
| **Elastic (13mo)** | $150,000 | $1,800,000 | Baseline |
| **Elastic (1mo)** | $50,000 | $600,000 | 3x cheaper |
| **Datadog** | $750,000 | $9,000,000 | 5x more expensive |

**Key Finding**: With 13-month retention, Elastic becomes **2x more expensive** than Grafana Cloud, despite being cheaper with 1-month retention.

#### Scenario: 10 Billion Metrics/Month with 13-Month Retention

**OpenTelemetry Metrics** (488 bytes/datapoint):

| Platform | Monthly Cost | Annual Cost | vs Elastic (13mo) |
|----------|--------------|-------------|-------------------|
| **Observe Inc** | $80,000 | $960,000 | 18.75x cheaper |
| **Grafana Cloud** | $3,000,000 | $36,000,000 | 2x more expensive |
| **Elastic (13mo)** | $1,500,000 | $18,000,000 | Baseline |
| **Elastic (1mo)** | $500,000 | $6,000,000 | 3x cheaper |
| **Datadog** | $7,500,000 | $90,000,000 | 5x more expensive |

**Key Finding**: At scale, the retention cost multiplier significantly impacts Elastic's competitive position.

### Retention Cost Implications for Pricing Models

#### Option 1: Volume-Based (Current) - With 13-Month Retention

**Cost Structure**:
- 1-month: $0.109/GB/month
- 13-month: $0.337/GB/month (3.1x increase)

**Competitive Position**:
- ❌ **Significant disadvantage** vs. Grafana Cloud (2x more expensive with 13-month retention)
- ❌ **Major disadvantage** vs. Observe Inc (18.75x more expensive)
- ⚠️ **Neutral** vs. Datadog (still cheaper, but gap narrows)
- ✅ **Advantage** vs. platforms without included retention

**Recommendation**: Current model becomes uncompetitive for customers requiring 13-month retention.

#### Option 2: Per-Metric Pricing - With 13-Month Retention

**If Elastic adopted per-metric pricing with 13-month retention included**:

**Proposed Pricing**: $0.30-$0.50/1M metrics (with 13-month retention included)

**Competitive Position**:
- ✅ **Competitive** vs. Grafana Cloud ($0.30/1M)
- ✅ **Competitive** vs. Chronosphere ($0.45/1M)
- ✅ **Advantage** vs. Datadog ($0.75/1M)
- ❌ **Disadvantage** vs. Observe Inc ($0.008/1M, but likely loss-leader)

**Recommendation**: Per-metric pricing with included retention would be competitive, but loses Elastic's differentiation.

#### Option 3: Hybrid Model - With 13-Month Retention

**Proposed Implementation**:
- Volume-based: $0.337/GB/month (13-month retention)
- Per-metric cap: $0.40/1M metrics (with 13-month retention included)
- Customer pays the **lower** of the two calculations

**Competitive Position**:
- ✅ **Competitive** vs. Grafana Cloud (per-metric cap applies)
- ✅ **Maintains advantage** for high-cardinality (volume-based applies)
- ✅ **Flexible** for all customer types

**Recommendation**: Hybrid model with 13-month retention included in per-metric cap would maintain competitiveness.

### Strategic Options for Retention

#### Option A: Include 13-Month Retention in Base Price

**Implementation**:
- Increase base price to include 13-month retention
- **Volume-based**: $0.337/GB/month (includes 13-month retention)
- **Per-metric**: $0.40/1M metrics/month (includes 13-month retention)

**Pros**:
- ✅ **Competitive**: Matches competitor offerings
- ✅ **Simple**: One price includes retention
- ✅ **Sales-friendly**: Easy to communicate

**Cons**:
- ❌ **Higher base price**: May appear more expensive for customers who don't need 13-month retention
- ❌ **Revenue impact**: Customers with shorter retention pay for unused retention

#### Option B: Tiered Retention Pricing

**Implementation**:
- **Standard (1 month)**: $0.109/GB/month
- **Extended (13 months)**: $0.337/GB/month
- **Custom**: Longer retention available at additional cost

**Pros**:
- ✅ **Flexible**: Customers pay only for retention they need
- ✅ **Competitive base**: Lower price for customers with short retention
- ✅ **Upsell opportunity**: Can offer extended retention as add-on

**Cons**:
- ❌ **Complex**: Multiple price points to manage
- ❌ **Competitive disadvantage**: Competitors include 13-month retention in base price
- ❌ **Sales complexity**: Need to explain retention tiers

#### Option C: Hybrid Retention Model

**Implementation**:
- **Base price**: Includes 1-month retention ($0.109/GB/month)
- **Extended retention**: Add $0.019/GB/month per additional month (up to 13 months)
- **13-month total**: $0.337/GB/month

**Pros**:
- ✅ **Flexible**: Customers can choose retention period
- ✅ **Transparent**: Clear pricing for retention
- ✅ **Competitive**: Can match competitors for 13-month retention

**Cons**:
- ❌ **Complex**: Requires understanding of retention tiers
- ❌ **Competitive disadvantage**: Competitors include 13-month retention in base price

### Recommendation: Retention Strategy

**Primary Recommendation**: **Include 13-Month Retention in Base Price**

**Rationale**:
1. **Market Standard**: Most competitors include 13-month retention in base price
2. **Competitive Necessity**: Without included retention, Elastic is 2x more expensive than Grafana Cloud
3. **Customer Expectation**: Customers expect long-term retention for compliance and analysis
4. **Simplified Pricing**: One price is easier to communicate and sell

**Implementation**:
- **Volume-based**: $0.337/GB/month (includes 13-month retention)
- **Per-metric cap (if hybrid)**: $0.40/1M metrics/month (includes 13-month retention)
- **Positioning**: "13-month retention included - no additional charges"

**Alternative**: If including 13-month retention in base price is not feasible, consider:
- **Tiered retention pricing** with competitive 13-month tier
- **Bundle discount** for customers requiring extended retention
- **Strategic positioning** emphasizing other value (unified platform, cardinality-friendly, etc.)

---

## Strategic Recommendations

### Recommended Approach: **Option 3 - Hybrid Model (Volume-Based with Per-Metric Cap) + 13-Month Retention**

**Rationale**:
1. **Best of Both Worlds**: Maintains Elastic's differentiation (volume-based) while competing on price (per-metric cap)
2. **Customer-Friendly**: Never unfairly penalizes customers
3. **Competitive**: Can compete with per-metric platforms on price, especially with 13-month retention included
4. **Differentiation**: Still unique in the market
5. **Flexible**: Works for all customer segments
6. **Retention Competitive**: Includes 13-month retention to match market standard

**Implementation Details**:
- **Volume-based pricing**: $0.337/GB/month (includes 13-month retention)
- **Per-metric cap**: $0.40 per million metrics/month (includes 13-month retention)
- **Customer pays**: Lower of the two calculations
- **Free tier option**: Consider 10M metrics/month free (similar to New Relic's approach)
- **Retention**: 13 months included in base price (matches Grafana Cloud, Observe Inc, Datadog)

**Price Point Justification**:
- **$0.40/1M metrics**: 
  - 33% more expensive than Grafana starting tier ($0.30)
  - 47% cheaper than Datadog ($0.75)
  - Competitive with Splunk ($0.55) and Dynatrace ($0.60)
  - Premium positioning without being excessive

### Alternative Recommendation: **Option 4 - Tiered Per-Metric Pricing + 13-Month Retention**

**If Hybrid Model is Too Complex**:
- **Starter**: $0.50/1M metrics (0-100M/month, 13-month retention included)
- **Growth**: $0.40/1M metrics (100M-1B/month, 13-month retention included)
- **Enterprise**: $0.30/1M metrics (1B+/month, 13-month retention included)
- **Elite**: Custom pricing (10B+/month, 13-month retention included)

**Rationale**:
- Simpler to explain than hybrid model
- Matches market standard (Grafana's approach)
- Clear upgrade path for customers
- Competitive at each tier
- **Includes 13-month retention** to match competitor offerings

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

### Scenario 1: Hybrid Model ($0.40/1M cap, 13-month retention included)

**Assumptions**:
- 1,000 customers
- Average: 50M metrics/month per customer
- 60% low-cardinality (per-metric cap applies)
- 40% high-cardinality (volume-based applies)
- All customers require 13-month retention

**Revenue Calculation**:
- Low-cardinality: 600 customers × 50M × $0.40/1M = $12M/month
- High-cardinality: 400 customers × (volume-based @ $0.337/GB, avg $0.15/1M with 13mo retention) = $3M/month
- **Total**: $15M/month = **$180M/year**

**vs. Current Model (1-month retention)**:
- All customers: 1,000 × (volume-based, avg $0.05/1M) = $2.5M/month
- **Total**: $2.5M/month = **$30M/year**

**vs. Current Model (13-month retention)**:
- All customers: 1,000 × (volume-based @ $0.337/GB, avg $0.15/1M) = $7.5M/month
- **Total**: $7.5M/month = **$90M/year**

**Impact**: 
- vs. 1-month retention: +500% revenue increase (but assumes 10x customer growth)
- vs. 13-month retention: +100% revenue increase (but assumes 2x customer growth)
- **Key**: Including 13-month retention in base price is essential for competitiveness

### Scenario 2: Tiered Per-Metric Model (13-month retention included)

**Assumptions**:
- Same customer base
- 20% Starter, 50% Growth, 25% Enterprise, 5% Elite
- All tiers include 13-month retention

**Revenue Calculation**:
- Starter: 200 × 50M × $0.50/1M = $5M/month
- Growth: 500 × 50M × $0.40/1M = $10M/month
- Enterprise: 250 × 50M × $0.30/1M = $3.75M/month
- Elite: 50 × 50M × $0.25/1M (custom) = $0.625M/month
- **Total**: $19.375M/month = **$232.5M/year**

**vs. Current Model (13-month retention)**:
- All customers: 1,000 × (volume-based @ $0.337/GB, avg $0.15/1M) = $7.5M/month
- **Total**: $7.5M/month = **$90M/year**

**Impact**: 
- +158% revenue increase vs. current 13-month retention model
- Higher revenue potential, but requires customer acquisition
- **Key**: Tiered model with included retention is competitive and revenue-positive

---

## Final Recommendations

### Primary Recommendation: **Hybrid Model (Volume-Based with Per-Metric Cap) + 13-Month Retention**

**Implementation**:
- Volume-based: $0.337/GB/month (includes 13-month retention)
- Per-metric cap: $0.40 per million metrics/month (includes 13-month retention)
- Customer pays: Lower of the two
- Free tier: 10M metrics/month (optional)
- Retention: 13 months included (matches market standard)

**Why This Model**:
1. ✅ Maintains Elastic's differentiation (cardinality-friendly)
2. ✅ Competes on price (per-metric cap)
3. ✅ Works for all customer segments
4. ✅ Maintains unified pricing model
5. ✅ Customer-friendly (never penalizes unfairly)
6. ✅ **Competitive retention** (13 months included, matches Grafana Cloud, Observe Inc, Datadog)

### Secondary Recommendation: **Tiered Per-Metric Pricing + 13-Month Retention**

**If Hybrid Model is Too Complex**:
- Starter: $0.50/1M (0-100M/month, 13-month retention included)
- Growth: $0.40/1M (100M-1B/month, 13-month retention included)
- Enterprise: $0.30/1M (1B+/month, 13-month retention included)
- Elite: Custom (10B+/month, 13-month retention included)

**Why This Model**:
1. ✅ Simple to understand and explain
2. ✅ Matches market standard (Grafana)
3. ✅ Clear upgrade path
4. ✅ Competitive at each tier
5. ✅ **Includes 13-month retention** (matches competitor offerings)

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

### Per 1 Million Datapoints (OpenTelemetry, 488 bytes/datapoint) - 1-Month Retention

| Platform | Price/1M Datapoints | Retention | vs Elastic (Current) | vs Elastic (Hybrid @ $0.40) |
|----------|---------------------|-----------|----------------------|------------------------------|
| Observe Inc | $0.008 | 13 months | 6.25x cheaper | 50x cheaper |
| New Relic | $0.25 | 30 days | 5x more expensive | 1.6x more expensive |
| Grafana Cloud | $0.30 | 13 months | 6x more expensive | 1.33x more expensive |
| **Elastic (Hybrid)** | **$0.40** | **13 months** | **N/A** | **Baseline** |
| Chronosphere | $0.45 | 13 months | 9x more expensive | 1.125x more expensive |
| Splunk Observability | $0.55 | Varies | 11x more expensive | 1.375x more expensive |
| Dynatrace | $0.60 | Varies | 12x more expensive | 1.5x more expensive |
| Datadog | $0.75 | 15 months | 15x more expensive | 1.875x more expensive |
| **Elastic (Current)** | **~$0.05** | **1 month** | **Baseline** | **8x cheaper** |

### Per 1 Million Datapoints (OpenTelemetry, 488 bytes/datapoint) - 13-Month Retention

| Platform | Price/1M Datapoints | Retention Included | vs Elastic (13mo) | vs Elastic (Hybrid @ $0.40) |
|----------|---------------------|---------------------|-------------------|------------------------------|
| Observe Inc | $0.008 | ✅ Yes | 18.75x cheaper | 50x cheaper |
| Grafana Cloud | $0.30 | ✅ Yes | 2x more expensive | 1.33x more expensive |
| **Elastic (Hybrid)** | **$0.40** | **✅ Yes** | **N/A** | **Baseline** |
| Chronosphere | $0.45 | ✅ Yes | 1.125x more expensive | 1.125x more expensive |
| Datadog | $0.75 | ✅ Yes | 1.875x more expensive | 1.875x more expensive |
| **Elastic (13mo)** | **~$0.15** | **✅ Yes** | **Baseline** | **2.67x cheaper** |
| **Elastic (1mo)** | **~$0.05** | **❌ No** | **3x cheaper** | **8x cheaper** |

**Key Insight**: With 13-month retention, Elastic's current volume-based pricing ($0.15/1M datapoints) is **2x more expensive** than Grafana Cloud ($0.30/1M), but the hybrid model with included retention ($0.40/1M) would be competitive.

### Per 1 Million Datapoints (Prometheus, 296 bytes/datapoint) - 1-Month Retention

| Platform | Price/1M Datapoints | Retention | vs Elastic (Current) | vs Elastic (Hybrid @ $0.40) |
|----------|---------------------|-----------|----------------------|------------------------------|
| Observe Inc | $0.008 | 13 months | 3.75x cheaper | 50x cheaper |
| New Relic | $0.25 | 30 days | 8.3x more expensive | 1.6x more expensive |
| Grafana Cloud | $0.30 | 13 months | 10x more expensive | 1.33x more expensive |
| **Elastic (Hybrid)** | **$0.40** | **13 months** | **N/A** | **Baseline** |
| Chronosphere | $0.45 | 13 months | 15x more expensive | 1.125x more expensive |
| Splunk Observability | $0.55 | Varies | 18.3x more expensive | 1.375x more expensive |
| Dynatrace | $0.60 | Varies | 20x more expensive | 1.5x more expensive |
| Datadog | $0.75 | 15 months | 25x more expensive | 1.875x more expensive |
| **Elastic (Current)** | **~$0.03** | **1 month** | **Baseline** | **13.3x cheaper** |

### Per 1 Million Datapoints (Prometheus, 296 bytes/datapoint) - 13-Month Retention

| Platform | Price/1M Datapoints | Retention Included | vs Elastic (13mo) | vs Elastic (Hybrid @ $0.40) |
|----------|---------------------|---------------------|-------------------|------------------------------|
| Observe Inc | $0.008 | ✅ Yes | 12.5x cheaper | 50x cheaper |
| Grafana Cloud | $0.30 | ✅ Yes | 3x more expensive | 1.33x more expensive |
| **Elastic (Hybrid)** | **$0.40** | **✅ Yes** | **N/A** | **Baseline** |
| Chronosphere | $0.45 | ✅ Yes | 1.5x more expensive | 1.125x more expensive |
| Datadog | $0.75 | ✅ Yes | 2.5x more expensive | 1.875x more expensive |
| **Elastic (13mo)** | **~$0.10** | **✅ Yes** | **Baseline** | **4x cheaper** |
| **Elastic (1mo)** | **~$0.03** | **❌ No** | **3.3x cheaper** | **13.3x cheaper** |

**Key Insight**: With 13-month retention, Elastic's current volume-based pricing ($0.10/1M datapoints) is **3x more expensive** than Grafana Cloud ($0.30/1M) for Prometheus metrics, but the hybrid model with included retention ($0.40/1M) would be competitive.

---

**Document Version**: 1.0  
**Last Updated**: January 2025  
**Author**: Pricing Strategy Analysis  
**Status**: Recommendations for Review
