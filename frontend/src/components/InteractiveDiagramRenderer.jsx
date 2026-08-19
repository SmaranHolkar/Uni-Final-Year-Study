import React, { useState, useEffect, useRef } from 'react';
import {
  RotateCcw,
  CheckCircle2,
  Maximize2,
  Minimize2,
  Activity,
  GitBranch,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Play,
  HelpCircle,
  AlertCircle
} from 'lucide-react';

/* Medical Traced Heart SVG Vector Spec */
const MEDICAL_HEART_VECTOR_SPEC = {
  viewBox: '0 0 800 650',
  svgMarkup: `
    <g id="grays-anatomy-traced-heart" filter="url(#heartShadow)">
      <path id="superior-vena-cava" d="M 235 45 C 235 90, 245 150, 240 215 C 215 210, 185 190, 165 170 C 160 120, 175 75, 175 45 Z" fill="url(#blueVeinGrad)" stroke="#1e40af" stroke-width="2.5"/>
      <path id="inferior-vena-cava" d="M 230 460 L 235 570 C 205 575, 175 570, 155 565 L 155 460 Z" fill="url(#blueVeinGrad)" stroke="#1e40af" stroke-width="2.5"/>
      <path id="aortic-arch" d="M 335 175 C 335 75, 415 35, 515 50 C 580 65, 605 135, 595 220 C 585 245, 555 255, 535 235 C 545 165, 525 115, 485 90 C 445 70, 385 100, 385 175 Z" fill="url(#redAortaGrad)" stroke="#991b1b" stroke-width="3"/>
      <path d="M 435 60 C 435 40, 432 25, 435 10 C 445 8, 460 8, 470 10 C 472 25, 470 40, 470 55 Z" fill="url(#redAortaGrad)" stroke="#991b1b" stroke-width="2"/>
      <path d="M 490 52 C 495 35, 502 20, 512 8 C 522 8, 530 10, 532 15 C 525 28, 518 42, 515 56 Z" fill="url(#redAortaGrad)" stroke="#991b1b" stroke-width="2"/>
      <path d="M 540 66 C 555 45, 570 28, 582 15 C 592 18, 598 24, 595 32 C 582 48, 568 65, 560 82 Z" fill="url(#redAortaGrad)" stroke="#991b1b" stroke-width="2"/>
      <path id="pulmonary-trunk" d="M 320 220 C 310 145, 245 125, 175 135 C 145 140, 135 155, 145 170 C 195 165, 245 175, 260 225 Z" fill="url(#pulmonaryGrad)" stroke="#1d4ed8" stroke-width="2.5"/>
      <path id="right-atrium-body" d="M 180 230 C 150 250, 140 310, 160 375 C 180 435, 230 460, 275 440 C 255 380, 240 300, 250 230 Z" fill="url(#atriumMuscleGrad)" stroke="#b91c1c" stroke-width="3"/>
      <path id="right-ventricle-body" d="M 275 440 C 230 460, 190 420, 175 375 C 180 435, 250 515, 365 565 C 385 575, 410 540, 395 480 C 345 460, 305 450, 275 440 Z" fill="url(#ventricleMuscleGrad)" stroke="#991b1b" stroke-width="3"/>
      <path id="left-atrium-body" d="M 525 180 C 605 180, 665 230, 655 310 C 645 350, 615 370, 585 360 C 565 300, 545 230, 525 180 Z" fill="url(#atriumMuscleGrad)" stroke="#b91c1c" stroke-width="3"/>
      <path id="left-ventricle-apex" d="M 585 360 C 645 370, 675 420, 645 500 C 595 560, 505 605, 435 625 C 415 630, 395 620, 385 600 C 375 580, 395 540, 425 510 C 485 450, 545 390, 585 360 Z" fill="url(#apexMuscleGrad)" stroke="#7f1d1d" stroke-width="4"/>
      <path d="M 390 225 C 380 325, 400 465, 435 620" stroke="#dc2626" stroke-width="5.5" fill="none" stroke-linecap="round"/>
      <path d="M 395 305 Q 330 355 265 400" stroke="#ef4444" stroke-width="3.5" fill="none"/>
      <path d="M 405 345 Q 480 390 555 430" stroke="#ef4444" stroke-width="3.5" fill="none"/>
      <path d="M 415 415 Q 490 470 565 500" stroke="#2563eb" stroke-width="3" fill="none"/>
      <path d="M 390 275 Q 315 305 235 325" stroke="#2563eb" stroke-width="3" fill="none"/>
    </g>
  `,
  targets: [
    { id: 'superior_vena_cava', label: 'Superior Vena Cava', role: 'Deoxygenated Inflow Vein', whatItDoes: 'Carries deoxygenated blood from upper body to right atrium.', whyItWorks: 'Wide vena cava trunk minimizes flow resistance.', x: 200, y: 100, radius: 42 },
    { id: 'aorta', label: 'Aortic Arch', role: 'Main Systemic Artery', whatItDoes: 'Distributes oxygenated blood under high pressure to systemic organs.', whyItWorks: 'Thick elastic arterial wall withstands systolic pressure bursts (~120 mmHg).', x: 490, y: 50, radius: 45 },
    { id: 'pulmonary_artery', label: 'Pulmonary Artery', role: 'Pulmonary Outflow Artery', whatItDoes: 'Transports deoxygenated blood from right ventricle to lungs.', whyItWorks: 'Splits into left and right branches to supply both lungs simultaneously.', x: 230, y: 155, radius: 40 },
    { id: 'right_atrium', label: 'Right Atrium', role: 'Venous Receiving Chamber', whatItDoes: 'Collects returning deoxygenated blood from systemic circulation.', whyItWorks: 'Low-pressure thin muscle chamber collects blood without venous backpressure.', x: 205, y: 290, radius: 44 },
    { id: 'right_ventricle', label: 'Right Ventricle', role: 'Pulmonary Pump Chamber', whatItDoes: 'Pumps deoxygenated blood through pulmonary valve into pulmonary artery.', whyItWorks: 'Muscular wall tuned to propel blood through low-resistance lung capillaries.', x: 280, y: 460, radius: 45 },
    { id: 'left_atrium', label: 'Left Atrium', role: 'Oxygenated Receiving Chamber', whatItDoes: 'Receives fresh oxygen-rich blood returning from pulmonary veins.', whyItWorks: 'Acts as holding reservoir before filling the high-pressure left ventricle.', x: 590, y: 270, radius: 44 },
    { id: 'left_ventricle', label: 'Left Ventricle', role: 'High-Pressure Systemic Pump', whatItDoes: 'Forcefully propels oxygenated blood into the aorta for systemic delivery.', whyItWorks: 'Featuring a 3x thicker cardiac muscle wall to generate 120 mmHg systemic pressure.', x: 530, y: 480, radius: 45 },
    { id: 'apex', label: 'Heart Apex', role: 'Conical Apex Vector', whatItDoes: 'Focuses ventricular contraction vector upwards toward arterial outlets.', whyItWorks: 'Structural anchor for spiral cardiac muscle fibers during systole.', x: 430, y: 605, radius: 40 },
    { id: 'coronary_vessels', label: 'Coronary Sulcus Network', role: 'Myocardial Blood Supply', whatItDoes: 'Delivers oxygen and nutrients directly to active cardiac muscle tissue.', whyItWorks: 'Branches directly off the aortic root to ensure high-pressure coronary perfusion.', x: 390, y: 360, radius: 40 }
  ]
};

// Tree layout generator for Binary Search Trees and Data Structures
function generateBSTLayout() {
  return {
    nodes: [
      { id: 'n50', label: '50 (Root)', role: 'Root Partition Node', whatItDoes: 'Partitions all values: smaller keys to the left, larger keys to the right.', whyItWorks: 'Enables O(log N) binary elimination search efficiency.', x: 400, y: 90, radius: 44, val: 50 },
      { id: 'n25', label: '25', role: 'Left Subtree Root', whatItDoes: 'Holds values smaller than 50 and larger than 10.', whyItWorks: 'Maintains binary search invariant for left branch.', x: 230, y: 230, radius: 40, val: 25 },
      { id: 'n75', label: '75', role: 'Right Subtree Root', whatItDoes: 'Holds values strictly greater than 50.', whyItWorks: 'Maintains binary search invariant for right branch.', x: 570, y: 230, radius: 40, val: 75 },
      { id: 'n10', label: '10', role: 'Left Leaf Node', whatItDoes: 'Terminal leaf containing key 10.', whyItWorks: 'Bottom level node with no child pointers.', x: 140, y: 390, radius: 38, val: 10 },
      { id: 'n35', label: '35', role: 'Right Child of 25', whatItDoes: 'Terminal node storing key 35.', whyItWorks: '35 > 25 (Go Right of 25) and 35 < 50 (Left of Root).', x: 320, y: 390, radius: 38, val: 35 },
      { id: 'n60', label: '60', role: 'Left Child of 75', whatItDoes: 'Stores key 60.', whyItWorks: '60 > 50 (Right of Root) and 60 < 75 (Left of 75).', x: 480, y: 390, radius: 38, val: 60 },
      { id: 'n90', label: '90', role: 'Right Leaf Node', whatItDoes: 'Terminal leaf for largest key 90.', whyItWorks: '90 > 75 (Right of 75).', x: 660, y: 390, radius: 38, val: 90 }
    ],
    edges: [
      { from: { x: 400, y: 90, id: 'n50' }, to: { x: 230, y: 230, id: 'n25' }, label: '25 < 50 (Go Left)' },
      { from: { x: 400, y: 90, id: 'n50' }, to: { x: 570, y: 230, id: 'n75' }, label: '75 > 50 (Go Right)' },
      { from: { x: 230, y: 230, id: 'n25' }, to: { x: 140, y: 390, id: 'n10' }, label: '10 < 25 (Go Left)' },
      { from: { x: 230, y: 230, id: 'n25' }, to: { x: 320, y: 390, id: 'n35' }, label: '35 > 25 (Go Right)' },
      { from: { x: 570, y: 230, id: 'n75' }, to: { x: 480, y: 390, id: 'n60' }, label: '60 < 75 (Go Left)' },
      { from: { x: 570, y: 230, id: 'n75' }, to: { x: 660, y: 390, id: 'n90' }, label: '90 > 75 (Go Right)' }
    ],
    defaultSteps: [
      {
        step: 1,
        title: 'Step 1: Root Node (50)',
        narration: 'We start with an empty BST. The first inserted key (50) becomes the Root node.',
        why: 'WHY: The root serves as the foundational decision pivot for all future insertions and lookups.',
        activeNodeId: 'n50',
        flowDirection: 'Root initialized to 50'
      },
      {
        step: 2,
        title: 'Step 2: Inserting 25',
        narration: 'Next value 25 arrives. We compare 25 with the root (50). Since 25 < 50, it routes to the left subtree.',
        why: 'WHY: In a BST, keys smaller than the current node MUST be placed in the left branch to preserve O(log N) search invariant.',
        activeNodeId: 'n50',
        targetNodeId: 'n25',
        flowDirection: 'Compare 25 < 50 → Traverse Left → Insert Node 25'
      },
      {
        step: 3,
        title: 'Step 3: Inserting 75',
        narration: 'Now we insert 75. Compare 75 with root (50). Since 75 > 50, it routes to the right subtree.',
        why: 'WHY: Keys greater than the current node belong in the right subtree.',
        activeNodeId: 'n50',
        targetNodeId: 'n75',
        flowDirection: 'Compare 75 > 50 → Traverse Right → Insert Node 75'
      },
      {
        step: 4,
        title: 'Step 4: Inserting 35',
        narration: 'Insert 35. Compare with root (50): 35 < 50 (Go Left to 25). Compare with 25: 35 > 25 (Go Right of 25).',
        why: 'WHY: Multi-level comparisons continuously narrow down the insertion location down the tree depth.',
        activeNodeId: 'n25',
        targetNodeId: 'n35',
        flowDirection: '35 < 50 (Left) → 35 > 25 (Right) → Attach Node 35'
      }
    ]
  };
}

// Dynamically generate node layout for any scientific/logical process when spec.nodes is empty
function generateNodesFromTopicAndSteps(spec) {
  const steps = Array.isArray(spec?.narrativeFlow) && spec.narrativeFlow.length > 0
    ? spec.narrativeFlow
    : [];

  if (steps.length === 0) {
    return [
      { id: 'stage_1', label: 'Initial Phase', role: 'System Stage', whatItDoes: 'Core functional stage of system.', whyItWorks: 'Essential physical or logical process.', x: 250, y: 300, radius: 45 },
      { id: 'stage_2', label: 'Final Outcome', role: 'System Stage', whatItDoes: 'Transition mechanism.', whyItWorks: 'Core underlying principle.', x: 550, y: 300, radius: 45 }
    ];
  }

  const count = steps.length;
  const cx = 400;
  const cy = 300;
  const rx = Math.min(260, 60 + count * 35);
  const ry = Math.min(180, 45 + count * 25);

  return steps.map((s, idx) => {
    const angle = (idx / count) * 2 * Math.PI - Math.PI / 2;
    const x = Math.round(cx + rx * Math.cos(angle));
    const y = Math.round(cy + ry * Math.sin(angle));
    const stepTitle = String(s.title || `Stage ${s.step || idx + 1}`);
    const cleanLabel = stepTitle.replace(/^Step\s*\d+:\s*/i, '').replace(/^Phase\s*\d+:\s*/i, '').trim();
    const id = s.activeNodeId || `node_${idx + 1}`;

    return {
      id,
      label: cleanLabel || `Stage ${idx + 1}`,
      role: `Stage ${s.step || idx + 1} of ${count}`,
      whatItDoes: s.narration || s.whatItDoes || `Key mechanism in ${cleanLabel}`,
      whyItWorks: s.why || s.whyItWorks || 'Fundamental principle driving this stage.',
      x,
      y,
      radius: 44
    };
  });
}

// Anatomically accurate explanatory steps for Heart & Cardiovascular System
function generateHeartSteps() {
  return [
    {
      step: 1,
      title: 'Phase 1: Right Atrium (Deoxygenated Return)',
      narration: 'The Right Atrium receives deoxygenated blood returning from the upper and lower body via the Superior & Inferior Vena Cava.',
      why: 'WHY: Serves as a low-pressure reservoir to collect venous blood without building backpressure in systemic veins before filling the right ventricle.',
      activeNodeId: 'right_atrium',
      targetNodeId: 'right_ventricle',
      flowDirection: 'Body → Vena Cava → Right Atrium → Tricuspid Valve'
    },
    {
      step: 2,
      title: 'Phase 2: Right Ventricle (Pulmonary Circulation)',
      narration: 'The Right Ventricle contracts, pumping deoxygenated blood through the Pulmonary Valve & Artery to the Lungs for oxygenation.',
      why: 'WHY: Features a moderately thick muscular wall tuned to generate just enough pressure to send blood through delicate lung pulmonary capillaries.',
      activeNodeId: 'right_ventricle',
      targetNodeId: 'pulmonary_artery',
      flowDirection: 'Right Atrium → Right Ventricle → Pulmonary Artery → Lungs'
    },
    {
      step: 3,
      title: 'Phase 3: Left Atrium (Oxygenated Inflow)',
      narration: 'Oxygen-rich blood returns directly from the lungs via four Pulmonary Veins into the Left Atrium.',
      why: 'WHY: Collects oxygenated blood coming from pulmonary gas exchange before opening the mitral valve to fill the high-pressure main pump.',
      activeNodeId: 'left_atrium',
      targetNodeId: 'left_ventricle',
      flowDirection: 'Lungs → Pulmonary Veins → Left Atrium → Mitral Valve'
    },
    {
      step: 4,
      title: 'Phase 4: Left Ventricle & Aorta (Systemic Distribution)',
      narration: 'The powerful Left Ventricle contracts forcefully, driving oxygenated blood through the Aortic Valve into the Aorta to supply all organs and tissues.',
      why: 'WHY: The Left Ventricle myocardium is 3x thicker than the right ventricle to generate high systemic blood pressure (~120 mmHg) to push blood throughout the entire body.',
      activeNodeId: 'left_ventricle',
      targetNodeId: 'aorta',
      flowDirection: 'Left Atrium → Left Ventricle → Aortic Arch → Systemic Body Organs'
    }
  ];
}

export default function InteractiveDiagramRenderer({ diagram, onComplete, onToggleExpand, isExpanded }) {
  if (!diagram) return null;

  const spec = diagram.interactiveDiagram || diagram;
  const rawType = String(spec.diagramType || 'concept_map').toLowerCase();
  const titleLower = String(spec.title || '').toLowerCase();
  const descLower = String(spec.description || '').toLowerCase();

  const isHeart =
    titleLower.includes('heart') ||
    descLower.includes('heart') ||
    rawType === 'heart' ||
    rawType === 'cardiology';

  const isWaterCycle =
    titleLower.includes('water cycle') ||
    descLower.includes('water cycle') ||
    titleLower.includes('evaporat') ||
    descLower.includes('evaporat') ||
    rawType.includes('water_cycle') ||
    rawType.includes('watercycle');

  const isTreeOrDataStructure =
    rawType.includes('tree') ||
    rawType.includes('data_structure') ||
    titleLower.includes('tree') ||
    titleLower.includes('binary') ||
    titleLower.includes('bst') ||
    titleLower.includes('data structure') ||
    descLower.includes('binary search tree') ||
    descLower.includes('tree');

  const bstData = isTreeOrDataStructure ? generateBSTLayout() : null;


  // Interactivity & Step States
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [droppedPairs, setDroppedPairs] = useState({});
  const [score, setScore] = useState(0);
  const [hoveredTarget, setHoveredTarget] = useState(null);

  // Dragging States for Drag-and-drop mode
  const [draggingCard, setDraggingCard] = useState(null);
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const svgRef = useRef(null);
  const containerRef = useRef(null);

  const narrativeSteps = spec.narrativeFlow && spec.narrativeFlow.length > 0
    ? spec.narrativeFlow
    : (isHeart ? generateHeartSteps() : (bstData ? bstData.defaultSteps : []));

  const currentStep = narrativeSteps[currentStepIndex] || null;

  // Nodes & Edges setup — strictly avoid heart fallbacks for non-heart diagrams!
  const nodesList = isTreeOrDataStructure
    ? bstData.nodes
    : (Array.isArray(spec.nodes) && spec.nodes.length > 0
        ? spec.nodes
        : (Array.isArray(spec.targets) && spec.targets.length > 0
            ? spec.targets
            : (isHeart ? MEDICAL_HEART_VECTOR_SPEC.targets : generateNodesFromTopicAndSteps(spec))));


  const edgesList = isTreeOrDataStructure
    ? bstData.edges
    : (spec.edges || []);

  const cardsList = spec.cards && spec.cards.length > 0
    ? spec.cards
    : nodesList.map((n) => ({ id: n.id, text: n.label || n.id, correctTarget: n.id }));

  const handleOptionSelect = (optionIdx) => {
    setSelectedOption(optionIdx);
    if (!currentStep) return;

    const isCorrect = optionIdx === (currentStep.correctOptionIndex ?? 0);
    if (isCorrect) {
      setFeedback({
        type: 'success',
        message: currentStep.explanationOnCorrect || 'Correct decision! Traversal path verified.'
      });
      setScore((prev) => prev + 1);
    } else {
      setFeedback({
        type: 'error',
        message: currentStep.explanationOnWrong || 'Incorrect choice. Review the underlying mechanism.'
      });
    }
  };

  const nextStep = () => {
    if (currentStepIndex < narrativeSteps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
      setSelectedOption(null);
      setFeedback(null);
    } else if (onComplete) {
      onComplete();
    }
  };

  const prevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
      setSelectedOption(null);
      setFeedback(null);
    }
  };

  const handlePointerDown = (e, card) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setDragPos({ x: e.clientX, y: e.clientY });
    setDraggingCard(card);
  };

  useEffect(() => {
    const handlePointerMove = (e) => {
      if (!draggingCard) return;
      setDragPos({ x: e.clientX, y: e.clientY });

      if (svgRef.current) {
        const targets = svgRef.current.querySelectorAll('[data-target-id]');
        let foundHover = null;
        targets.forEach((tEl) => {
          const tRect = tEl.getBoundingClientRect();
          if (
            e.clientX >= tRect.left &&
            e.clientX <= tRect.right &&
            e.clientY >= tRect.top &&
            e.clientY <= tRect.bottom
          ) {
            foundHover = tEl.getAttribute('data-target-id');
          }
        });
        setHoveredTarget(foundHover);
      }
    };

    const handlePointerUp = () => {
      if (!draggingCard) return;

      if (hoveredTarget) {
        const isCorrect = draggingCard.correctTarget === hoveredTarget || draggingCard.id === hoveredTarget;
        if (isCorrect || !draggingCard.correctTarget) {
          setDroppedPairs((prev) => {
            const next = { ...prev, [draggingCard.id]: hoveredTarget };
            if (Object.keys(next).length === cardsList.length && onComplete) {
              onComplete();
            }
            return next;
          });
          setScore((prev) => prev + 1);
        }
      }

      setDraggingCard(null);
      setHoveredTarget(null);
    };

    if (draggingCard) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    }
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [draggingCard, hoveredTarget, cardsList.length, onComplete]);

  const resetActivity = () => {
    setCurrentStepIndex(0);
    setSelectedOption(null);
    setFeedback(null);
    setDroppedPairs({});
    setScore(0);
  };

  const effectiveExpanded = isExpanded !== undefined ? isExpanded : isFullscreen;
  const [selectedNode, setSelectedNode] = useState(null);

  return (
    <div
      ref={containerRef}
      className={`relative w-full rounded-2xl bg-[#07080c] border border-[#1b1e2c] text-[#f4f4f5] overflow-hidden flex flex-col transition-all ${
        effectiveExpanded ? 'fixed inset-0 z-50 rounded-none h-screen w-screen' : 'min-h-[580px]'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#1b1e2c] bg-[#040508]">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            {isHeart ? <Activity className="w-5 h-5 text-red-400" /> : <GitBranch className="w-5 h-5 text-indigo-400" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-wide">{spec.title || 'Interactive Explanatory Simulation'}</h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 border border-indigo-500/30 text-indigo-300">
                {spec.pedagogicalIntent || (isHeart ? 'process-simulator' : 'structure-labeler')}
              </span>
            </div>
            <p className="text-xs text-zinc-400 line-clamp-1">{spec.description || 'Step-by-step process walk-through with explicit WHAT & WHY explanations.'}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {narrativeSteps.length > 0 && (
            <div className="px-3 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-xs text-indigo-300 font-semibold">
              Step {currentStepIndex + 1} of {narrativeSteps.length}
            </div>
          )}
          <button
            onClick={resetActivity}
            className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
            title="Reset Simulation"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              if (onToggleExpand) {
                onToggleExpand();
              } else {
                setIsFullscreen(!isFullscreen);
              }
            }}
            className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
            title={effectiveExpanded ? 'Minimize (Restore Chat & Layout)' : 'Expand Fullscreen (Cover Chat & Right Side)'}
          >
            {effectiveExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Vector / Simulation Canvas */}
      <div className="relative flex-1 bg-gradient-to-b from-[#07080c] to-[#020305] flex flex-col items-center justify-center p-6 overflow-hidden">
        
        {/* Step Narration & WHAT / WHY Explanatory Bubble */}
        {currentStep && (
          <div className="w-full max-w-2xl mb-4 p-4 rounded-xl bg-[#0d1017] border border-[#23293a] text-zinc-200 shadow-xl flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-wider">{currentStep.title}</h4>
              <span className="text-[11px] font-mono text-indigo-400/90 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                {spec.causalHooks?.rule
                  ? `Rule: ${spec.causalHooks.rule}`
                  : isHeart
                  ? 'Mechanism: Pressure Differential & One-Way Valve Flow'
                  : 'System Principle'}
              </span>
            </div>

            {/* WHAT IT DOES */}
            <div className="text-xs text-zinc-200 leading-relaxed">
              <span className="font-bold text-indigo-300">WHAT HAPPENS: </span>
              {currentStep.narration}
            </div>

            {/* WHY IT WORKS */}
            {(currentStep.why || spec.causalHooks?.why) && (
              <div className="px-3 py-2 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-xs font-medium text-emerald-300 flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-emerald-200">WHY THIS OCCURS: </span>
                  {currentStep.why || spec.causalHooks.why}
                </div>
              </div>
            )}

            {/* FLOW / TRAVERSAL PATH */}
            {currentStep.flowDirection && (
              <div className="text-[11px] font-mono text-zinc-400 bg-zinc-900/60 px-3 py-1.5 rounded-lg border border-zinc-800">
                <span className="text-zinc-500 font-sans font-semibold">Flow Sequence: </span>
                <span className="text-indigo-300">{currentStep.flowDirection}</span>
              </div>
            )}
          </div>
        )}

        {/* SVG Canvas for Tree / Heart / Custom Simulation */}
        <svg
          ref={svgRef}
          viewBox={spec.viewBox || '0 0 800 520'}
          className="w-full h-full max-h-[460px] object-contain select-none"
        >
          <defs>
            <marker id="arrowhead" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#6366f1" />
            </marker>
            <marker id="arrowhead-cyan" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#38bdf8" />
            </marker>
            <radialGradient id="sunGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="60%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#d97706" />
            </radialGradient>
            <linearGradient id="oceanWaterGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0284c7" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#0369a1" stopOpacity="0.95" />
            </linearGradient>
            <filter id="activeGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="greenGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Render Medical Heart SVG vector if Heart */}
          {isHeart && (
            <g dangerouslySetInnerHTML={{ __html: MEDICAL_HEART_VECTOR_SPEC.svgMarkup }} />
          )}

          {/* Render Water Cycle Illustration Vectors (Sun, Clouds, Rain, Ocean Surface, Evaporation Vapor) */}
          {isWaterCycle && (
            <g id="water-cycle-illustration" opacity="0.9">
              {/* Sun in Top-Right */}
              <g transform="translate(680, 80)">
                <circle r="42" fill="url(#sunGrad)" filter="url(#activeGlow)" />
                <g stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="0" y1="-55" x2="0" y2="-46" />
                  <line x1="0" y1="46" x2="0" y2="55" />
                  <line x1="-55" y1="0" x2="-46" y2="0" />
                  <line x1="46" y1="0" x2="55" y2="0" />
                  <line x1="-38" y1="-38" x2="-32" y2="-32" />
                  <line x1="32" y1="32" x2="38" y2="38" />
                  <line x1="32" y1="-32" x2="38" y2="-38" />
                  <line x1="-38" y1="38" x2="-32" y2="32" />
                </g>
                <text x="0" y="5" fill="#78350f" fontSize="11" fontWeight="800" textAnchor="middle">Solar Energy</text>
              </g>

              {/* Cloud Layer Top */}
              <g transform="translate(380, 65)" fill="#38bdf8" fillOpacity="0.18" stroke="#38bdf8" strokeWidth="2">
                <path d="M 0 30 Q 0 0 30 0 Q 60 -15 90 0 Q 120 0 130 30 Z" />
              </g>
              <g transform="translate(180, 85)" fill="#818cf8" fillOpacity="0.18" stroke="#818cf8" strokeWidth="2">
                <path d="M 0 30 Q 0 0 30 0 Q 60 -15 90 0 Q 120 0 130 30 Z" />
              </g>

              {/* Evaporation Rising Vapor Vectors */}
              <path d="M 190 340 Q 170 260 190 180" stroke="#38bdf8" strokeWidth="3" strokeDasharray="6 6" fill="none" className="animate-pulse" markerEnd="url(#arrowhead-cyan)" />
              <path d="M 230 360 Q 210 280 230 200" stroke="#38bdf8" strokeWidth="3" strokeDasharray="6 6" fill="none" className="animate-pulse" markerEnd="url(#arrowhead-cyan)" />

              {/* Rain / Precipitation Vectors */}
              <path d="M 520 140 L 500 240" stroke="#60a5fa" strokeWidth="2.5" strokeDasharray="4 4" fill="none" markerEnd="url(#arrowhead-cyan)" />
              <path d="M 560 150 L 540 250" stroke="#60a5fa" strokeWidth="2.5" strokeDasharray="4 4" fill="none" markerEnd="url(#arrowhead-cyan)" />

              {/* Mountain Terrain */}
              <path d="M 380 430 L 460 290 L 540 430 Z" fill="#1e293b" stroke="#475569" strokeWidth="2" />

              {/* Ocean & Waves Bottom Surface */}
              <rect x="40" y="430" width="720" height="75" rx="16" fill="url(#oceanWaterGrad)" stroke="#0284c7" strokeWidth="2.5" />
              <path d="M 50 450 Q 110 435 170 450 T 290 450 T 410 450 T 530 450 T 650 450" stroke="#38bdf8" strokeWidth="2" fill="none" opacity="0.6" />
              <text x="400" y="475" fill="#e0f2fe" fontSize="13" fontWeight="800" textAnchor="middle">Ocean / Surface Collection</text>
            </g>
          )}

          {/* Render Directional Flow Vector Arrows between consecutive narrative steps */}
          {!isTreeOrDataStructure && !isHeart && nodesList.length > 1 && (
            <g id="narrative-flow-arrows">
              {nodesList.map((n, i) => {
                const nextN = nodesList[(i + 1) % nodesList.length];
                if (!nextN) return null;
                const isActivePath = currentStepIndex === i;

                return (
                  <g key={`flow-edge-${i}`}>
                    <line
                      x1={n.x}
                      y1={n.y}
                      x2={nextN.x}
                      y2={nextN.y}
                      stroke={isActivePath ? '#38bdf8' : '#334155'}
                      strokeWidth={isActivePath ? '3.5' : '2'}
                      strokeDasharray={isActivePath ? '6 6' : '3 3'}
                      markerEnd={isActivePath ? 'url(#arrowhead-cyan)' : 'url(#arrowhead)'}
                      className={isActivePath ? 'animate-pulse' : ''}
                    />
                  </g>
                );
              })}
            </g>
          )}

          {/* Render Tree / Graph Connecting Edges with Comparison Labels */}
          {isTreeOrDataStructure && edgesList.map((e, idx) => (
            <g key={idx}>
              <line
                x1={e.from.x}
                y1={e.from.y}
                x2={e.to.x}
                y2={e.to.y}
                stroke={currentStep?.activeNodeId === e.from.id ? '#818cf8' : '#334155'}
                strokeWidth={currentStep?.activeNodeId === e.from.id ? '3.5' : '2'}
                strokeDasharray="5 5"
                className={currentStep?.activeNodeId === e.from.id ? 'animate-pulse' : ''}
              />
              <text
                x={(e.from.x + e.to.x) / 2}
                y={(e.from.y + e.to.y) / 2 - 8}
                fill="#94a3b8"
                fontSize="10"
                fontWeight="600"
                textAnchor="middle"
                className="pointer-events-none"
              >
                {e.label}
              </text>
            </g>
          ))}

          {/* Render Interactive Nodes */}
          {nodesList.map((node, nodeIdx) => {
            const isActive = currentStep?.activeNodeId === node.id || currentStepIndex === nodeIdx;
            const isTarget = currentStep?.targetNodeId === node.id;
            const isSelectedNode = selectedNode?.id === node.id;

            const cardW = 140;
            const cardH = 50;

            return (
              <g
                key={node.id}
                data-target-id={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
                onClick={() => setSelectedNode(node)}
                className="cursor-pointer transition-transform duration-200 group hover:scale-105"
              >
                {/* Spacious Rounded Glass Node Card */}
                <rect
                  x={-cardW / 2}
                  y={-cardH / 2}
                  width={cardW}
                  height={cardH}
                  rx="14"
                  fill={isSelectedNode ? '#4f46e5' : isTarget ? '#047857' : isActive ? '#1e1b4b' : '#0f172a'}
                  fillOpacity={isSelectedNode ? 0.95 : isTarget ? 0.85 : isActive ? 0.95 : 0.8}
                  stroke={isSelectedNode ? '#a5b4fc' : isTarget ? '#34d399' : isActive ? '#38bdf8' : '#334155'}
                  strokeWidth={isActive || isTarget || isSelectedNode ? '2.5' : '1.5'}
                  filter={isActive || isTarget || isSelectedNode ? 'url(#activeGlow)' : undefined}
                  className="transition-colors duration-200 group-hover:stroke-indigo-400"
                />


                {/* Step Number Pill Badge */}
                <rect
                  x={-cardW / 2 + 8}
                  y={-cardH / 2 + 8}
                  width="22"
                  height="16"
                  rx="6"
                  fill={isActive ? '#38bdf8' : '#334155'}
                />
                <text
                  x={-cardW / 2 + 19}
                  y={-cardH / 2 + 20}
                  fill="#ffffff"
                  fontSize="10"
                  fontWeight="800"
                  textAnchor="middle"
                  className="pointer-events-none"
                >
                  {nodeIdx + 1}
                </text>

                {/* Main Node Label */}
                <text
                  x="10"
                  y="4"
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="12"
                  fontWeight="700"
                  className="pointer-events-none"
                >
                  {String(node.label || node.id).slice(0, 18)}
                </text>

                {/* Pulse Ring for Active Step Node */}
                {isActive && (
                  <rect
                    x={-cardW / 2 - 4}
                    y={-cardH / 2 - 4}
                    width={cardW + 8}
                    height={cardH + 8}
                    rx="18"
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="2"
                    className="animate-ping opacity-60 pointer-events-none"
                  />
                )}
              </g>
            );
          })}

        </svg>

        {/* Click Inspector Card for Any Component */}
        {selectedNode && (
          <div className="w-full max-w-2xl mt-4 p-4 rounded-xl bg-[#0d1322] border border-indigo-500/40 text-zinc-100 shadow-2xl flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h5 className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span>Component Inspector: {selectedNode.label || selectedNode.id}</span>
              </h5>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-xs text-zinc-400 hover:text-white px-2 py-0.5 rounded bg-zinc-800"
              >
                ✕ Close
              </button>
            </div>
            <p className="text-xs text-zinc-200 leading-relaxed">
              <strong className="text-indigo-300">WHAT IT DOES: </strong>
              {selectedNode.whatItDoes || selectedNode.role || 'Key functional component within this system.'}
            </p>
            <p className="text-xs text-zinc-300 leading-relaxed">
              <strong className="text-emerald-400">WHY IT WORKS: </strong>
              {selectedNode.whyItWorks || selectedNode.why || 'Essential mechanism required for structural operation.'}
            </p>
          </div>
        )}

        {/* Learner Decision Prediction Buttons */}
        {currentStep && currentStep.options && currentStep.options.length > 0 && (
          <div className="w-full max-w-2xl mt-4 flex flex-wrap items-center justify-center gap-3">
            {currentStep.options.map((optText, optIdx) => {
              const isSelected = selectedOption === optIdx;
              const isCorrectOpt = optIdx === currentStep.correctOptionIndex;

              return (
                <button
                  key={optIdx}
                  onClick={() => handleOptionSelect(optIdx)}
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                    isSelected
                      ? isCorrectOpt
                        ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300 ring-2 ring-emerald-400'
                        : 'bg-rose-600/30 border-rose-500 text-rose-300 ring-2 ring-rose-400'
                      : 'bg-indigo-600/20 hover:bg-indigo-600/40 border-indigo-500/40 text-indigo-200 hover:scale-105'
                  }`}
                >
                  {optText}
                </button>
              );
            })}
          </div>
        )}

        {/* Feedback Alert Overlay */}
        {feedback && (
          <div className={`w-full max-w-2xl mt-3 p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
          }`}>
            {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
            <span>{feedback.message}</span>
          </div>
        )}
      </div>

      {/* Footer Navigation Controls */}
      <div className="p-4 border-t border-[#1b1e2c] bg-[#040508] flex items-center justify-between">
        <button
          onClick={prevStep}
          disabled={currentStepIndex === 0}
          className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-300 text-xs font-bold flex items-center gap-1 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Previous
        </button>

        <div className="flex items-center gap-1.5">
          {narrativeSteps.map((_, idx) => (
            <div
              key={idx}
              className={`w-2.5 h-2.5 rounded-full transition-all ${
                idx === currentStepIndex ? 'bg-indigo-500 w-6' : 'bg-zinc-700'
              }`}
            />
          ))}
        </div>

        <button
          onClick={nextStep}
          className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1 transition-colors shadow-lg"
        >
          {currentStepIndex === narrativeSteps.length - 1 ? 'Finish Simulation' : 'Next Step'} <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
