package com.prepadel.risk;

import java.util.List;

/**
 * @param score    0 a 100
 * @param lastPain último dolor registrado en la zona, o null si no hay ninguno
 * @param reasons  por qué sale ese nivel, en frases para el jugador
 */
public record ZoneRisk(String zone, RiskLevel level, int score, Integer lastPain, List<String> reasons) {

}
