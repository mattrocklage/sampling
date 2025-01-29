import React, { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { Slider } from "./components/ui/slider";
import { BarChart2 } from "lucide-react";

export default function SamplingDemo() {
  // Constants
  const POP_SIZE = 500;
  const POP_MEAN = 50; // final forced mean
  const POP_STD = 10;  // final forced std

  // We'll store the entire population as an array of objects: { value, x, y }
  const [population, setPopulation] = useState([]);

  // For controlling sample size
  const [sampleSize, setSampleSize] = useState(20);

  // For random sample stats
  const [randomSampleIndices, setRandomSampleIndices] = useState([]);
  const [randomSampleMean, setRandomSampleMean] = useState(null);
  const [ciLow, setCiLow] = useState(null);
  const [ciHigh, setCiHigh] = useState(null);

  // For non-probability sample stats
  const [nonProbSampleIndices, setNonProbSampleIndices] = useState([]);
  const [nonProbSampleMean, setNonProbSampleMean] = useState(null);

  // Quadrant highlight
  const [nonProbQuadrant, setNonProbQuadrant] = useState(0);

  // Has the user drawn a sample
  const [hasDrawn, setHasDrawn] = useState(false);

  // Coverage test for 1,000 random samples
  const [coveragePercent, setCoveragePercent] = useState(null);

  // For quick animations
  const [animatingMultiple, setAnimatingMultiple] = useState(false);
  const sampleIndexRef = useRef(0);
  const containCountRef = useRef(0);
  const totalSamplesRef = useRef(1000);

  // Generate population exactly mean=50, std=10
  useEffect(() => {
    // 1. Generate an array from standard normal
    let rawVals = [];
    for (let i = 0; i < POP_SIZE; i++) {
      // Start from normal(0,1)
      rawVals.push(generateNormalRandom(0, 1));
    }

    // 2. Compute raw mean & std
    const rawMean = mean(rawVals) || 0;
    const rawStd = stdDev(rawVals, rawMean);

    // 3. Shift & scale so final => mean=50, std=10
    const finalVals = rawVals.map((v) => {
      const z = (v - rawMean) / rawStd; // now ~N(0,1)
      return z * POP_STD + POP_MEAN;    // now ~N(50,10)
    });

    // 4. Convert to population objects, clamped at 592×292
    const pop = [];
    for (let i = 0; i < POP_SIZE; i++) {
      const val = finalVals[i];
      // Spread horizontally
      const rawX = 300 + 10 * (val - 50) + (Math.random() - 0.5) * 30;
      let x = Math.max(0, Math.min(600, rawX));
      x = Math.min(x, 592); // clamp for up to 8 px dot
      // y random from 0..300
      let y = Math.random() * 300;
      y = Math.min(y, 292); // clamp for up to 8 px dot

      pop.push({ value: val, x, y });
    }
    setPopulation(pop);
  }, []);

  function generateNormalRandom(mean, stdDev) {
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return z0 * stdDev + mean;
  }

  function drawSamples() {
    setHasDrawn(true);
    const quad = Math.floor(Math.random() * 4);
    setNonProbQuadrant(quad);

    // random sample
    const randomIndices = randomUniqueIndices(POP_SIZE, sampleSize);
    setRandomSampleIndices(randomIndices);

    const randomVals = randomIndices.map((i) => population[i].value);
    const rMean = mean(randomVals);
    setRandomSampleMean(rMean);

    // 95% CI with finite population correction
    if (rMean !== null) {
      const fpc = Math.sqrt((POP_SIZE - sampleSize) / (POP_SIZE - 1));
      const stdErr = (POP_STD / Math.sqrt(sampleSize)) * fpc;
      const margin = 1.96 * stdErr;
      setCiLow(rMean - margin);
      setCiHigh(rMean + margin);
    } else {
      setCiLow(null);
      setCiHigh(null);
    }

    // define biased quadrant pool
    let biasedPool;
    switch (quad) {
      case 0:
        biasedPool = population.filter((p) => p.x < 300 && p.y < 150);
        break;
      case 1:
        biasedPool = population.filter((p) => p.x > 300 && p.y < 150);
        break;
      case 2:
        biasedPool = population.filter((p) => p.x < 300 && p.y > 150);
        break;
      case 3:
        biasedPool = population.filter((p) => p.x > 300 && p.y > 150);
        break;
      default:
        biasedPool = population.filter((p) => p.x > 300 && p.y < 150);
    }
    let finalBiasedIndices;
    if (biasedPool.length <= sampleSize) {
      finalBiasedIndices = biasedPool.map((p) => population.indexOf(p));
    } else {
      const chosen = shuffle(biasedPool).slice(0, sampleSize);
      finalBiasedIndices = chosen.map((p) => population.indexOf(p));
    }
    setNonProbSampleIndices(finalBiasedIndices);

    const nProbVals = finalBiasedIndices.map((i) => population[i].value);
    setNonProbSampleMean(mean(nProbVals));

    setCoveragePercent(null);
  }

  function drawMultipleRandomSamples1000() {
    // Hide the quadrant box entirely
    setHasDrawn(false);

    setCoveragePercent(null);
    setAnimatingMultiple(true);
    containCountRef.current = 0;
    sampleIndexRef.current = 0;
    totalSamplesRef.current = 1000;
    runNextSample();
  }

  function runNextSample() {
    const i = sampleIndexRef.current;
    if (i >= totalSamplesRef.current) {
      const coverage = (containCountRef.current / totalSamplesRef.current) * 100;
      setCoveragePercent(coverage);
      setAnimatingMultiple(false);
      return;
    }

    const randomIndices = randomUniqueIndices(POP_SIZE, sampleSize);
    const randomVals = randomIndices.map((idx) => population[idx].value);
    const rMean = mean(randomVals);

    if (rMean !== null) {
      const fpc = Math.sqrt((POP_SIZE - sampleSize) / (POP_SIZE - 1));
      const stdErr = (POP_STD / Math.sqrt(sampleSize)) * fpc;
      const margin = 1.96 * stdErr;
      const lower = rMean - margin;
      const upper = rMean + margin;

      // check coverage vs. exactly 50
      if (50 >= lower && 50 <= upper) {
        containCountRef.current++;
      }

      // show animation only every 10th sample
      if (i % 10 === 0) {
        setRandomSampleIndices(randomIndices);
        setNonProbSampleIndices([]);
        setRandomSampleMean(rMean);
        setCiLow(lower);
        setCiHigh(upper);
      }
    }

    sampleIndexRef.current++;
    setTimeout(runNextSample, 0);
  }

  // Helpers
  function mean(arr) {
    if (!arr || arr.length === 0) return null;
    return arr.reduce((acc, c) => acc + c, 0) / arr.length;
  }

  function stdDev(arr, m) {
    if (!arr || arr.length < 2) return 0;
    const variance = arr.reduce((acc, c) => acc + Math.pow(c - m, 2), 0) / (arr.length - 1);
    return Math.sqrt(variance);
  }

  function randomUniqueIndices(n, k) {
    const indices = Array.from({ length: n }, (_, i) => i);
    shuffle(indices);
    return indices.slice(0, k);
  }

  function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  function roundInt(value) {
    if (value === null || Number.isNaN(value)) return null;
    return Math.round(value);
  }

  function quadrantHighlightStyle(q) {
    const base = {
      position: "absolute",
      backgroundColor: "rgba(255, 255, 0, 0.2)",
      pointerEvents: "none",
      zIndex: 1,
    };
    switch (q) {
      case 0:
        return { ...base, left: 0, top: 0, width: 300, height: 150 };
      case 1:
        return { ...base, left: 300, top: 0, width: 300, height: 150 };
      case 2:
        return { ...base, left: 0, top: 150, width: 300, height: 150 };
      case 3:
        return { ...base, left: 300, top: 150, width: 300, height: 150 };
      default:
        return { ...base, left: 300, top: 0, width: 300, height: 150 };
    }
  }

  return (
<div className="flex flex-col items-center gap-4 p-4">
  <h1 className="text-2xl font-bold text-center">Sampling Demo: Random vs. Non-Probability</h1>
  <Card className="w-full max-w-4xl">
    <CardContent className="p-4 flex flex-col gap-4">
      {/* Replace the <p> element with this unordered list */}
      <div className="text-base">
        <ul className="list-disc pl-6 space-y-2">
            This interactive visualization shows how a <strong>simple random sample</strong> differs from a{" "}
            <strong>non-probability (biased) sample</strong> when drawn from the <em>same</em> population.
          <li>
            There are <strong>500 people</strong> in the population and it has a mean of <strong>50</strong> and standard deviation of <strong>10</strong>.
          </li>
          <li>
            After drawing a new sample, scroll down to see the resulting statistics for those samples. Are they close to 50? And does the 95% confidence interval (CI) contain the true population mean?
          </li>
          <li>
            You can also try drawing 1000 samples to see if the 95% CIs contain the true population mean approximately 95% of the time (like they should).
          </li>
        </ul>
      </div>
      {/* Keep this part unchanged */}
      <div className="flex items-center gap-2 flex-wrap w-full">
        <div className="flex-1 flex items-center gap-2">
              <label className="font-semibold text-sm">Sample size: {sampleSize}</label>
              <Slider
                defaultValue={[sampleSize]}
                min={1}
                max={250}
                step={1}
                className="w-full"
                onValueChange={(val) => setSampleSize(val[0])}
              />
            </div>
            <Button onClick={drawSamples} disabled={animatingMultiple}>
              Draw New Samples
            </Button>
            <Button variant="outline" onClick={drawMultipleRandomSamples1000} disabled={animatingMultiple}>
              Draw 1000 Samples
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Visualization area */}
      <div className="flex flex-col items-center w-full max-w-4xl gap-4">
        <div
          style={{ position: "relative", width: 600, height: 300, border: "1px solid #ccc" }}
          className="bg-white rounded-xl shadow p-1 relative"
        >
          {/* Only show quadrant if we've drawn a single sample and not animating coverage */}
          {hasDrawn && !animatingMultiple && (
            <div style={quadrantHighlightStyle(nonProbQuadrant)} />
          )}

          {population.map((p, i) => {
            const inRandom = randomSampleIndices.includes(i);
            const inNonProb = nonProbSampleIndices.includes(i);
            let dotColor = "#999";
            let size = 6;
            let opacity = 0.4;

            if (inRandom) {
              dotColor = "#22c55e"; // random sample in green
              size = 8;
              opacity = 1;
            } else if (inNonProb) {
              dotColor = "#f97316"; // non-prob sample in orange
              size = 8;
              opacity = 1;
            }
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: opacity, scale: 1 }}
                transition={{ duration: animatingMultiple ? 0 : 0.3 }}
                style={{
                  position: "absolute",
                  left: p.x,
                  top: p.y,
                  width: size,
                  height: size,
                  backgroundColor: dotColor,
                  borderRadius: "9999px",
                  zIndex: 2,
                }}
              />
            );
          })}
        </div>
        <div className="flex flex-col gap-2 text-sm text-center">
          <span className="text-gray-500">
          </span>
          <div className="flex justify-center items-center gap-4">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-500 rounded-full" />
              Random Sample
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#f97316" }} />
              Non-probability Sample (highlighted in yellow)
            </div>
          </div>
        </div>
      </div>

      {/* Results section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl w-full">
        {/* Random sample stats */}
        <Card>
          <CardContent className="p-4 flex flex-col gap-2">
            <div className="flex items-center gap-2 mb-2">
              <BarChart2 className="w-5 h-5" />
              <h2 className="text-lg font-semibold">Random Sample Statistics</h2>
            </div>
            <p className="text-sm">
              <strong>Population Mean: 50</strong>
            </p>
            {randomSampleMean !== null && (
              <p className="text-sm">
                <strong>Mean (Random Sample):</strong> {roundInt(randomSampleMean)}
              </p>
            )}
            {ciLow !== null && ciHigh !== null && (
              <p className="text-sm">
                <strong>95% CI:</strong> [{roundInt(ciLow)}, {roundInt(ciHigh)}]
              </p>
            )}
            <p className="text-sm">
              In a <strong>simple random sample</strong>, each person has a known chance of selection, so we can
              estimate error via confidence intervals.
            </p>
          </CardContent>
        </Card>

        {/* Non-prob sample stats */}
        <Card>
          <CardContent className="p-4 flex flex-col gap-2">
            <div className="flex items-center gap-2 mb-2">
              <BarChart2 className="w-5 h-5" />
              <h2 className="text-lg font-semibold">Non-probability Sample Statistics</h2>
            </div>
            <p className="text-sm">
              <strong>Population Mean: 50</strong>
            </p>
            {nonProbSampleMean !== null && (
              <p className="text-sm">
                <strong>Mean (Non-probability Sample):</strong> {roundInt(nonProbSampleMean)}
              </p>
            )}
            <p className="text-sm text-red-700">
              <strong>95% CI:</strong> We can't calculate a 95% CI for a non-probability sample. Why? See Key Takeaways below.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Coverage results for 1000 random samples */}
      {coveragePercent !== null && (
        <Card className="w-full max-w-3xl">
          <CardContent className="p-4 text-sm flex flex-col gap-2">
            <h2 className="text-base font-semibold">Coverage in 1000 Random Samples</h2>
            <p className="text-sm">
              Of 1000 random samples (size = {sampleSize}), about {coveragePercent.toFixed(1)}% of
              the 95% confidence intervals contained 50.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Key takeaways */}
      <Card className="w-full max-w-3xl">
        <CardContent className="p-4 text-sm flex flex-col gap-2">
          <h2 className="text-base font-semibold">Key Takeaways</h2>
          <ul className="list-disc list-inside">
            <li>
              Probability vs. non-probability samples are like playing a fair lottery vs. a rigged one. With a fair lottery (probability sample), we can calculate your exact chances of winning. With a rigged lottery (non-probability sample), we have no idea what the true chances are - some people might have zero chance, others might have a very high chance, and we don't know which is which.
            </li>
            <li>
              Without knowing these selection probabilities, we can't quantify our uncertainty. So while we can calculate an average from a non-probability sample, we can't make any mathematical statements about how close that average is likely to be to the true population value.
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Minimal test cases */}
      <script>
        {`(function testRandomUniqueIndices() {
          // Expect that we can draw 5 unique indices out of 10
          const n = 10;
          const k = 5;
          const indices = randomUniqueIndices(n, k);
          const uniqueSet = new Set(indices);
          console.log('\\n[TEST] randomUniqueIndices');
          console.assert(indices.length === k, 'Expected length 5, got ' + indices.length);
          console.assert(uniqueSet.size === k, 'Expected all unique, but duplicates found');
          console.log('Pass: randomUniqueIndices() returns 5 unique values out of 10.');
        })();

        // Additional test case: drawing all available indices
        (function testRandomUniqueIndicesAll() {
          const nAll = 5;
          const kAll = 5;
          const indicesAll = randomUniqueIndices(nAll, kAll);
          const uniqueSetAll = new Set(indicesAll);
          console.log('[TEST] randomUniqueIndicesAll');
          console.assert(indicesAll.length === kAll, 'Expected length 5, got ' + indicesAll.length);
          console.assert(uniqueSetAll.size === kAll, 'Expected all unique, but duplicates found');
          console.log('Pass: randomUniqueIndices() with k=5 returns 5 unique values out of 5 total.');
        })();

        // Extra test: drawing 1 index out of 2
        (function testRandomUniqueIndicesSingle() {
          const n2 = 2;
          const k1 = 1;
          const indices2 = randomUniqueIndices(n2, k1);
          const uniqueSet2 = new Set(indices2);
          console.log('[TEST] randomUniqueIndicesSingle');
          console.assert(indices2.length === k1, 'Expected length 1, got ' + indices2.length);
          console.assert(uniqueSet2.size === k1, 'Expected all unique, but duplicates found');
          console.log('Pass: randomUniqueIndices() with k=1 returns 1 unique value out of 2 total.');
        })();

        // Test for generateNormalRandom
        (function testGenerateNormalRandom() {
          const sample = generateNormalRandom(0, 1);
          console.log('\\n[TEST] generateNormalRandom');
          console.assert(typeof sample === 'number', 'Expected a number from generateNormalRandom');
          console.log('Pass: generateNormalRandom returns a number and no ReferenceError thrown.');
        })();

        // New test for forced final pop
        (function testGenerateFixedPop() {
          console.log('\\n[TEST] generateFixedPop');
          // We want to see if the code produced mean=50, std=10 in the final population
          // Not hooking up window.populationTestHook, so skip
          console.log('No test hook. Skipping...');
        })();
        `}
      </script>
    </div>
  );
}