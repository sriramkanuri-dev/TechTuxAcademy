import { cmd, code, diagram, formula, trouble, type ConceptDefinition } from './shared';

export const hardwareConcepts: ConceptDefinition[] = [
  {
    id: 'embedded-microcontrollers-gpio',
    courses: ['embedded', 'iot', 'electronics'],
    topics: ['microcontroller', 'gpio', 'blink', 'board', 'toolchain'],
    term: 'Microcontrollers, GPIO and the first blink',
    definition:
      'A microcontroller integrates a CPU, memory and peripherals on one chip. GPIO pins are digital inputs or outputs controlled by firmware.',
    paragraphs: [
      'A microcontroller differs from a general-purpose computer: it has constrained memory, deterministic timing requirements and direct access to hardware peripherals. Firmware is usually written in C or C++ and compiled for a specific architecture.',
      'GPIO pins can be configured as inputs, outputs or alternate functions. A blink program toggles an output pin with a delay. The delay can be a busy loop, a hardware timer or an RTOS task; each choice affects power use and timing accuracy.',
      'The toolchain includes a cross-compiler, a flashing tool and often a vendor SDK. Read the board schematic to confirm pin numbers, voltage levels and whether the pin is 5 V tolerant. Never connect a load directly to a pin beyond its current rating.',
    ],
    code: [
      code(
        'c',
        'Bare-metal blink outline',
        `#include <stdint.h>
#include "board.h"

int main(void) {
    gpio_set_mode(LED_PORT, LED_PIN, GPIO_OUTPUT);
    for (;;) {
        gpio_toggle(LED_PORT, LED_PIN);
        delay_ms(500);
    }
}`,
        ['The exact GPIO API depends on the vendor SDK.', 'An infinite loop is normal in bare-metal firmware.']
      ),
    ],
    commands: [
      cmd('Toolchain', 'arm-none-eabi-gcc --version', 'Check the ARM cross-compiler version.', ['arm-none-eabi-gcc --version']),
      cmd('Build', 'make', 'Build firmware using the project Makefile.', ['make', 'make flash']),
      cmd('Serial', 'screen /dev/ttyUSB0 115200', 'Open a serial console at 115200 baud.', ['screen /dev/ttyUSB0 115200'], {
        warnings: ['Confirm the device node; the wrong one may be another USB device.'],
      }),
    ],
    diagram: diagram('circuit', 'GPIO LED circuit', 'Microcontroller pin, current-limiting resistor, LED and ground.'),
    formulas: [
      formula('LED resistor', 'R = (V_source − V_LED) / I_LED', 'Choose a resistor that limits current to the LED rating.'),
    ],
    mistakes: [
      'Connecting an LED without a current-limiting resistor.',
      'Using a pin that is not actually connected to the LED on the board.',
      'Assuming all GPIO pins tolerate 5 V.',
    ],
    troubleshooting: [
      trouble('The LED does not blink.', 'Check the pin mapping, output mode, power, ground and whether the firmware actually flashed.'),
      trouble('The board resets repeatedly.', 'Check the power supply, brown-out settings and whether the flashing tool is holding reset.'),
    ],
  },
  {
    id: 'embedded-sensors-adc',
    courses: ['embedded', 'iot', 'electronics'],
    topics: ['sensor', 'adc', 'serial', 'protocol', 'signal', 'i2c', 'spi', 'uart'],
    term: 'Sensors, ADC and serial protocols',
    definition:
      'Sensors convert physical quantities into electrical signals. An ADC converts analog voltage into a digital number. Serial protocols move data between chips.',
    paragraphs: [
      'An ADC has a resolution, reference voltage and sampling rate. The smallest detectable change is approximately V_ref / 2^bits. Noise, impedance and layout affect accuracy more than the nominal resolution. Filter and average readings when appropriate, but do not hide real dynamics.',
      'UART is asynchronous and point-to-point. I2C is a two-wire bus with addresses, useful for many low-speed sensors. SPI is a faster four-wire bus with chip-select lines. Each protocol has voltage, timing and pull-up requirements that must match the devices.',
      'Read the sensor datasheet for the measurement range, supply voltage, communication protocol and conversion time. Validate raw values against a known reference before trusting a calibrated physical value.',
    ],
    code: [
      code(
        'c',
        'Convert an ADC reading to voltage',
        `#define ADC_MAX 4095.0f
#define V_REF   3.3f

float raw_to_voltage(uint16_t raw) {
    return (raw / ADC_MAX) * V_REF;
}

float voltage_to_temperature_c(float voltage) {
    // Example linear sensor: 10 mV per degree C, 500 mV at 0 C
    return (voltage - 0.5f) / 0.010f;
}`,
        ['The conversion constants must come from the actual sensor datasheet.', 'A 12-bit ADC has 4096 codes, so the maximum raw value is 4095.']
      ),
    ],
    commands: [
      cmd('Serial', 'ls /dev/ttyUSB* /dev/ttyACM*', 'List common USB serial devices.', ['ls /dev/ttyUSB* /dev/ttyACM*']),
      cmd('I2C', 'i2cdetect -y 1', 'Scan an I2C bus for device addresses.', ['sudo i2cdetect -y 1'], {
        warnings: ['Use the correct bus number and voltage level; scanning the wrong bus can disturb other devices.'],
      }),
      cmd('SPI', 'ls /dev/spidev*', 'List SPI device nodes.', ['ls /dev/spidev*']),
    ],
    diagram: diagram('circuit', 'Sensor signal chain', 'Sensor, analog conditioning, ADC, microcontroller, serial bus, dashboard.'),
    formulas: [
      formula('ADC voltage', 'V = (raw / (2^bits − 1)) · V_ref', 'Convert a raw ADC code to voltage.'),
      formula('Nyquist rate', 'f_s > 2 · f_max', 'Sample faster than twice the highest signal frequency to avoid aliasing.'),
    ],
    mistakes: [
      'Ignoring the ADC reference voltage.',
      'Forgetting I2C pull-up resistors.',
      'Sampling too slowly for the signal being measured.',
    ],
    troubleshooting: [
      trouble('ADC readings jump around.', 'Check grounding, decoupling, sensor supply noise and whether averaging is appropriate.'),
      trouble('An I2C device is not detected.', 'Check wiring, address, pull-ups, voltage levels and bus number.'),
    ],
  },
  {
    id: 'embedded-wifi-mqtt',
    courses: ['embedded', 'iot'],
    topics: ['wi-fi', 'wifi', 'mqtt', 'cloud dashboard', 'publish sensor data'],
    term: 'Wi-Fi, MQTT and cloud dashboards',
    definition:
      'Wi-Fi connects a device to an IP network. MQTT is a lightweight publish/subscribe protocol commonly used to move telemetry between devices and a broker.',
    paragraphs: [
      'MQTT uses topics, a broker, clients and quality-of-service levels. QoS 0 is fire-and-forget, QoS 1 guarantees at-least-once delivery and QoS 2 guarantees exactly-once delivery with more overhead. Choose based on whether duplicate or lost messages are acceptable.',
      'Design topics hierarchically, for example home/lab/temperature. Keep payloads small and self-describing, often JSON with a timestamp. Use retained messages sparingly and a last-will message to detect offline devices.',
      'Secure the connection with TLS, unique device credentials and broker-side authorization. A cloud dashboard subscribes to topics, stores time-series data and visualises it. Do not expose the broker publicly without authentication and rate limits.',
    ],
    code: [
      code(
        'json',
        'A small telemetry payload',
        `{
  "deviceId": "esp32-lab-01",
  "temperatureC": 27.4,
  "humidityPct": 61.2,
  "ts": "2026-11-09T12:00:00Z"
}`,
        ['Include a device id and timestamp so data remains interpretable after transport.', 'Keep field names stable; dashboards depend on them.']
      ),
    ],
    commands: [
      cmd('MQTT', 'mosquitto_sub -h broker.example -t "home/lab/#" -v', 'Subscribe to a topic tree and print topic plus payload.', ['mosquitto_sub -h broker.example -t "home/lab/#" -v']),
      cmd('MQTT', 'mosquitto_pub -h broker.example -t "home/lab/temp" -m "27.4"', 'Publish a message to a topic.', ['mosquitto_pub -h broker.example -t "home/lab/temp" -m "27.4"']),
      cmd('Network', 'ping -c 4 broker.example', 'Check basic reachability before debugging MQTT.', ['ping -c 4 broker.example']),
    ],
    diagram: diagram('network', 'IoT telemetry path', 'Device, Wi-Fi, MQTT broker, ingestion service, time-series database, dashboard.'),
    mistakes: [
      'Using QoS 0 for billing or safety-critical events.',
      'Hard-coding Wi-Fi and broker credentials in firmware.',
      'Publishing unbounded payloads or frequencies.',
    ],
    troubleshooting: [
      trouble('The device connects to Wi-Fi but not the broker.', 'Check DNS, TLS time, credentials, client id conflicts and broker logs.'),
      trouble('Messages arrive duplicated.', 'That is expected with QoS 1; make consumers idempotent or use QoS 2 where appropriate.'),
    ],
  },
  {
    id: 'embedded-home-automation',
    courses: ['embedded', 'iot', 'robotics'],
    topics: ['home automation', 'iot project', 'design', 'build', 'secure'],
    term: 'Project: home automation mini-build',
    definition:
      'A home automation build combines sensors, actuators, a controller, a network link, a dashboard and a security model.',
    paragraphs: [
      'Define the user outcome first: what should happen, when, and how the user can override it. Draw the system diagram and list every input, output and failure mode. A relay that controls mains voltage requires proper isolation and qualified hardware; low-voltage prototypes should not be connected directly to mains.',
      'Separate sensing, decision and actuation. A local rule should still work when the cloud is unavailable. Log state changes and expose a manual override. Use debouncing and hysteresis so a sensor near a threshold does not chatter.',
      'Secure the build: unique credentials, TLS, network segmentation, signed firmware updates and a recovery path. Test power loss, network loss and sensor failure. A home automation system that fails unsafe is worse than no automation.',
    ],
    diagram: diagram('flow', 'Home automation architecture', 'Sensors, controller, local rules, actuators, broker, dashboard, alerts.'),
    mistakes: [
      'Connecting mains voltage without proper isolation and certification.',
      'Depending entirely on the cloud for local control.',
      'Ignoring sensor failure and stuck actuator states.',
    ],
    troubleshooting: [
      trouble('The system works in the lab but not after deployment.', 'Check Wi-Fi signal, power stability, enclosure temperature and cable strain.'),
      trouble('A relay chatters.', 'Add hysteresis, debouncing and a minimum switching interval.'),
    ],
  },
  {
    id: 'vlsi-digital-verilog',
    courses: ['vlsi', 'semiconductor', 'digital design'],
    topics: ['digital design', 'verilog', 'combinational', 'sequential', 'logic', 'rtl'],
    term: 'Digital design and Verilog refresher',
    definition:
      'Digital design builds circuits from combinational logic and state elements. Verilog describes hardware behaviour at the register-transfer level for synthesis and simulation.',
    paragraphs: [
      'Combinational logic depends only on current inputs; sequential logic depends on stored state and a clock. A flip-flop samples its input on a clock edge. Setup and hold requirements define a window around that edge during which the input must be stable.',
      'Verilog is not a sequential programming language. always @(*) describes combinational logic; always @(posedge clk) describes sequential logic. Use non-blocking assignments (<=) in sequential blocks and blocking assignments (=) in combinational blocks. Incomplete sensitivity lists and inferred latches are common mistakes.',
      'Write a testbench that drives inputs, checks outputs and reports pass/fail. Simulation verifies functional intent; synthesis maps the RTL to gates. Not all synthesizable code simulates identically, so run gate-level simulation when the risk justifies it.',
    ],
    code: [
      code(
        'verilog',
        'A synchronous counter',
        `module counter #(parameter WIDTH = 8) (
    input  wire             clk,
    input  wire             rst_n,
    input  wire             enable,
    output reg [WIDTH-1:0]  count
);
    always @(posedge clk or negedge rst_n) begin
        if (!rst_n)
            count <= {WIDTH{1'b0}};
        else if (enable)
            count <= count + 1'b1;
    end
endmodule`,
        ['Non-blocking assignment models the flip-flop behaviour.', 'The asynchronous reset is active low and included in the sensitivity list.']
      ),
    ],
    commands: [
      cmd('Simulation', 'iverilog -o sim tb_counter.v counter.v', 'Compile a Verilog design and testbench with Icarus Verilog.', ['iverilog -o sim tb_counter.v counter.v']),
      cmd('Simulation', 'vvp sim', 'Run the compiled simulation.', ['vvp sim']),
      cmd('Waveforms', 'gtkwave dump.vcd', 'Open a VCD waveform file.', ['gtkwave dump.vcd']),
    ],
    diagram: diagram('flow', 'RTL design flow', 'Specification, RTL, simulation, synthesis, gate netlist, physical design.'),
    formulas: [
      formula('Setup slack', 'Setup slack = T_clk − T_launch − T_logic − T_setup + T_skew', 'Positive slack means the path meets the setup requirement.'),
      formula('Hold slack', 'Hold slack = T_launch + T_logic − T_hold − T_skew', 'Hold violations must be fixed with delay or layout changes.'),
    ],
    mistakes: [
      'Using blocking assignments in sequential always blocks.',
      'Inferring an unintended latch in combinational logic.',
      'Comparing simulation behaviour without checking synthesis warnings.',
    ],
    troubleshooting: [
      trouble('Simulation output is X.', 'Check reset initialisation, unconnected inputs and multiple drivers.'),
      trouble('Synthesis warns about inferred latches.', 'Assign every output on every path in combinational logic.'),
    ],
  },
  {
    id: 'vlsi-synthesis-sta',
    courses: ['vlsi', 'semiconductor'],
    topics: ['synthesis', 'static timing', 'constraint', 'clock', 'timing report', 'sta'],
    term: 'Synthesis and static timing analysis',
    definition:
      'Synthesis maps RTL to a gate-level netlist for a target library. Static timing analysis checks all timing paths against clock and I/O constraints without simulation vectors.',
    paragraphs: [
      'Synthesis translates RTL into generic gates, optimises logic and maps to standard cells. The result depends on the target library, constraints and optimisation effort. Read synthesis warnings: inferred latches, unconnected ports and multi-driven nets are real design issues.',
      'STA models clocks, input/output delays, uncertainty and exceptions. A path starts at a launch register or input and ends at a capture register or output. Setup checks whether data arrives early enough; hold checks whether it stays stable long enough after the edge.',
      'Clock domain crossings require synchronisers or asynchronous FIFOs. False paths and multicycle paths are exceptions that must be justified; applying them to hide real violations is dangerous. Always review the worst negative slack and the top failing paths.',
    ],
    commands: [
      cmd('Synthesis', 'yosys -p "read_verilog design.v; synth; stat"', 'Run an open-source synthesis flow and print statistics.', ['yosys -p "read_verilog design.v; synth; stat"']),
      cmd('STA', 'sta -f constraints.tcl', 'Run an open-source static timing analysis script.', ['sta -f constraints.tcl']),
    ],
    diagram: diagram('timeline', 'Setup and hold windows', 'Launch edge, combinational delay, capture edge, setup and hold margins.'),
    formulas: [
      formula('Clock period', 'T_clk = 1 / f_clk', 'The period must exceed the longest register-to-register delay plus margins.'),
      formula('Setup slack', 'Slack_setup = T_clk − T_launch − T_logic,max − T_setup + T_skew', 'Positive slack indicates a met setup requirement.'),
    ],
    mistakes: [
      'Ignoring synthesis warnings because the design simulates correctly.',
      'Applying false-path exceptions without understanding the path.',
      'Forgetting clock uncertainty and I/O delays in constraints.',
    ],
    troubleshooting: [
      trouble('Timing fails only after synthesis.', 'Compare RTL and gate-level paths, check constraints and inspect the worst path report.'),
      trouble('Hold violations appear after place and route.', 'Add delay buffers or adjust clock skew; hold fixes are usually physical.'),
    ],
  },
  {
    id: 'vlsi-physical-design',
    courses: ['vlsi', 'semiconductor'],
    topics: ['floorplan', 'placement', 'routing', 'netlist', 'physical layout', 'gdsii'],
    term: 'Floorplanning, placement and routing',
    definition:
      'Physical design converts a gate netlist into a geometric layout: floorplan, placement, clock tree synthesis, routing and signoff.',
    paragraphs: [
      'Floorplanning places macros, I/O pins and power structures. Placement decides standard-cell locations; routing connects them with metal wires. Congestion, timing and power are coupled, so a decision in one stage affects the others.',
      'Clock tree synthesis distributes the clock with controlled skew and insertion delay. Routing must respect design rules and timing. Parasitic extraction feeds back into timing analysis, which may trigger ECOs or re-optimisation.',
      'The output is a GDSII stream plus reports. Physical verification checks design rules (DRC) and layout-versus-schematic (LVS). A clean GDSII is not automatically a good design; timing, power and reliability must also be signed off.',
    ],
    diagram: diagram('pipeline', 'Physical design flow', 'Floorplan, placement, CTS, routing, extraction, STA, DRC/LVS, GDSII.'),
    mistakes: [
      'Ignoring congestion during floorplanning.',
      'Treating placement as independent of timing.',
      'Skipping parasitic extraction before final timing signoff.',
    ],
    troubleshooting: [
      trouble('Routing fails with congestion.', 'Spread placement, adjust macro placement, add routing resources or reduce local density.'),
      trouble('Timing degrades after routing.', 'Use extracted parasitics, identify the worst paths and apply targeted optimisation or ECOs.'),
    ],
  },
  {
    id: 'vlsi-signoff',
    courses: ['vlsi', 'semiconductor'],
    topics: ['drc', 'lvs', 'tapeout', 'signoff', 'silicon', 'checks'],
    term: 'Signoff: DRC, LVS and tapeout',
    definition:
      'Signoff verifies that a layout satisfies manufacturing rules and matches the intended schematic before tapeout.',
    paragraphs: [
      'Design rule checking (DRC) verifies spacing, width, enclosure and density rules from the foundry. Layout versus schematic (LVS) verifies that the extracted layout connectivity matches the netlist. Both must be clean on the final database.',
      'Additional signoff includes antenna checks, electromigration, IR drop, timing, power and reliability analysis. Each check has a methodology and a signoff corner. A waiver must be documented and approved, never silently ignored.',
      'Tapeout is a controlled handoff. Freeze the database, record tool versions and checksums, archive reports and confirm the mask layer map. A small mistake at this stage is extremely expensive.',
    ],
    diagram: diagram('pipeline', 'Signoff gate', 'Layout, DRC, LVS, timing/power, reliability, review, tapeout.'),
    mistakes: [
      'Waiving DRC errors without foundry approval.',
      'Running LVS on a stale netlist.',
      'Losing reproducibility by not recording tool versions and inputs.',
    ],
    troubleshooting: [
      trouble('DRC reports thousands of violations after a small change.', 'Check the rule deck version, units and whether the change introduced a new cell or layer.'),
      trouble('LVS reports mismatches.', 'Compare the extracted netlist with the schematic, check power/ground connections and label mismatches.'),
    ],
  },
];
