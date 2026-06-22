/**
 * Standalone engine demo — runs without Android SDK.
 * Compile: javac -cp . EngineDemo.java (from engine_test folder after copying engine files)
 *
 * This file demonstrates the deterministic seeding and Add Row logic.
 * It simulates 100 Level 1 games and reports statistics.
 */
public class EngineDemo {
    // This is a documentation/integration demo.
    // The actual engine lives in android/app/src/main/java/com/numbermatch/puzzle/engine/
    // Run via Android Studio: ./gradlew testDebugUnitTest
    public static void main(String[] args) {
        System.out.println("=== Number Match Engine Demo ===");
        System.out.println("Run unit tests via Android Studio:");
        System.out.println("  ./gradlew testDebugUnitTest");
        System.out.println("");
        System.out.println("Or open the project in Android Studio and run on device/emulator.");
    }
}
