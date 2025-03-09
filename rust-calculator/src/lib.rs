use wasm_bindgen::prelude::*;

/* Core calculator logic that can be used both by wasm and for native testing
   Input: A string representing a mathematical expression
   Output: An i32 representing the result of the expression or an error message
*/
pub fn evaluate_expression(expression: &str) -> Result<i32, String> {
    let mut numbers: Vec<i32> = Vec::new(); //stack for numbers
    let mut operators: Vec<char> = Vec::new(); //stack for operators
    
    let mut i = 0;
    let chars: Vec<char> = expression.chars().collect();

    // Flag to track if we're expecting a number or an operator
    // True when we're expecting a number (at the start, after an operator, or after an opening parenthesis)
    let mut expect_number = true;

    while i < chars.len() {
        let c = chars[i];
        
        //skip whitespace
        if c.is_whitespace() {
            i += 1;
            continue;
        }
        
        //parse numbers
        //detect the start of a number, accumulate all of the digits of the number, and then push the number to the numbers stack
        if c.is_digit(10) {
            let mut number = 0;

            while i < chars.len() && chars[i].is_digit(10) {
                number = number * 10 + chars[i].to_digit(10).unwrap() as i32;
                i += 1;
            }

            numbers.push(number);
            expect_number = false; // After a number, we expect an operator
            continue;
        }

        //handle parentheses
        if c == '(' {
            operators.push(c);
            expect_number = true; // After an opening parenthesis, we expect a number
        } else if c == ')' {
            while !operators.is_empty() && operators.last().unwrap() != &'(' { //applies all operators until the matching opening parenthesis is found, OR, the operators stack is empty
                apply_operator(&mut numbers, &mut operators)?;
            }

            if operators.is_empty() || operators.last().unwrap() != &'(' { //if operators stack is empty (no opening parenthesis matched), or the last operator in the stack is not the matching opening parenthesis, then ERROR!
                return Err("Mismatched parentheses".to_string());
            }

            operators.pop(); //remove the matching opening parenthesis from the stack
            expect_number = false; // After a closing parenthesis, we expect an operator
        } else if is_operator(c) {
            // Handle unary minus (negative sign at the beginning or after another operator)
            if c == '-' && expect_number {
                // This is a unary minus
                // Push 0 to the numbers stack so that we can subtract from it
                numbers.push(0);
                operators.push('-');
            } else {
                // This is a binary operator
                //first process operators with higher precedence AND if current operator is not the first operator of an opening parenthesis (in which case it should be applied immediately), only then push the current operator to the stack
                while !operators.is_empty() && 
                    operators.last().unwrap() != &'(' && 
                    precedence(operators.last().unwrap()) >= precedence(&c) {
                    apply_operator(&mut numbers, &mut operators)?;
                }

                operators.push(c);
            }
            expect_number = true; // After any operator, we expect a number
        } else {
            return Err(format!("Invalid character: {}", c));
        }

        i += 1;
    }

    //process remaining operators in the stack
    while !operators.is_empty() {
        if operators.last().unwrap() == &'(' {
            return Err("Mismatched parentheses".to_string());
        }
        apply_operator(&mut numbers, &mut operators)?;
    }
    
    if numbers.len() != 1 {
        return Err("Invalid expression".to_string());
    }
    
    Ok(numbers[0])
}

fn is_operator(c: char) -> bool {
    c == '+' || c == '-' || c == '*' || c == '/'
}

fn precedence(op: &char) -> u8 {
    match op {
        '+' | '-' => 1,
        '*' | '/' => 2,
        _ => 0,
    }
}

fn apply_operator(numbers: &mut Vec<i32>, operators: &mut Vec<char>) -> Result<(), String> {
    if numbers.len() < 2 {
        return Err("Invalid expression: not enough operands".to_string());
    }
    
    let op = operators.pop().unwrap();
    let b = numbers.pop().unwrap();
    let a = numbers.pop().unwrap();
    
    let result = match op {
        '+' => a + b,
        '-' => a - b,
        '*' => a * b,
        '/' => {
            if b == 0 {
                return Err("Division by zero".to_string());
            }
            a / b
        },
        _ => return Err(format!("Unknown operator: {}", op)),
    };
    
    numbers.push(result);
    Ok(())
}

/* Public API (to js) for the calculator
    Input: A string representing a mathematical expression
    Output: An i32 representing the result of the expression or an error message
*/
#[wasm_bindgen]
pub fn calculate(expression: &str) -> Result<i32, JsValue> {
    match evaluate_expression(expression) {
        Ok(result) => Ok(result),
        Err(err) => Err(JsValue::from_str(&format!("Error: {}", err))),
    }
}

// Test module - only compiled when running tests
#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_addition() {
        assert_eq!(evaluate_expression("2 + 3").unwrap(), 5);
        assert_eq!(evaluate_expression("10 + 20").unwrap(), 30);
    }
    
    #[test]
    fn test_subtraction() {
        assert_eq!(evaluate_expression("5 - 3").unwrap(), 2);
        assert_eq!(evaluate_expression("10 - 20").unwrap(), -10);
    }
    
    #[test]
    fn test_multiplication() {
        assert_eq!(evaluate_expression("2 * 3").unwrap(), 6);
        assert_eq!(evaluate_expression("10 * 20").unwrap(), 200);
    }
    
    #[test]
    fn test_division() {
        assert_eq!(evaluate_expression("6 / 3").unwrap(), 2);
        assert_eq!(evaluate_expression("5 / 2").unwrap(), 2); // Integer division
    }
    
    #[test]
    fn test_precedence() {
        assert_eq!(evaluate_expression("2 + 3 * 4").unwrap(), 14);
        assert_eq!(evaluate_expression("2 * 3 + 4").unwrap(), 10);
    }
    
    #[test]
    fn test_parentheses() {
        assert_eq!(evaluate_expression("(2 + 3) * 4").unwrap(), 20);
        assert_eq!(evaluate_expression("2 * (3 + 4)").unwrap(), 14);
    }
    
    #[test]
    fn test_negative_numbers() {
        assert_eq!(evaluate_expression("-5").unwrap(), -5);
        assert_eq!(evaluate_expression("-5 + 3").unwrap(), -2);
        assert_eq!(evaluate_expression("5 + -3").unwrap(), 2);
        assert_eq!(evaluate_expression("-5 * -3").unwrap(), 15);
        assert_eq!(evaluate_expression("(-5)").unwrap(), -5);
        assert_eq!(evaluate_expression("5 * (-3 + 1)").unwrap(), -10);
    }
    
    #[test]
    fn test_division_by_zero() {
        assert!(evaluate_expression("5 / 0").is_err());
    }
    
    #[test]
    fn test_invalid_characters() {
        assert!(evaluate_expression("2 + a").is_err());
    }
    
    #[test]
    fn test_mismatched_parentheses() {
        assert!(evaluate_expression("(2 + 3").is_err());
    }
}